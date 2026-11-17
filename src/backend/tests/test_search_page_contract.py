"""What the Search page asks of ``POST /search/advanced`` and of the two facet endpoints.

Until November 2026 the page sent its paging and its order in the request's body and the
endpoint did not read them: it answered every request with the first 20 records in no stated
order and called the length of that answer the total. The filter panel got counts of all
students, whatever was typed, and on SQLite a Greek name was not found at all. The tests here
fail on that code.
"""

from datetime import date

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.models import Course, Grade, Student
from backend.services.search_service import SearchService, fold_text
from backend.sqlite_unicode import sql_translate, unicode_lower

ENDPOINT = "/api/v1/search/advanced"


def _student(db: Session, first: str, last: str, number: str, **extra) -> Student:
    student = Student(
        first_name=first,
        last_name=last,
        email=extra.pop("email", f"{number.lower()}@search.example.com"),
        student_id=number,
        **extra,
    )
    db.add(student)
    db.commit()
    return student


def _search(client, headers, body: dict, address: str = "") -> dict:
    response = client.post(ENDPOINT + address, json=body, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def _names(payload: dict) -> list[str]:
    return [f"{row['first_name']} {row['last_name']}" for row in payload["data"]["results"]]


@pytest.fixture
def four_students(db: Session) -> None:
    """The four students of the E2E seed, entered out of alphabetical order."""
    _student(db, "John", "Doe", "S001", email="john.doe@example.com")
    _student(db, "Jane", "Smith", "S002", email="jane.smith@example.com")
    _student(db, "Bob", "Williams", "S004", email="bob.williams@example.com")
    _student(db, "Alice", "Johnson", "S003", email="alice.johnson@example.com")


@pytest.fixture
def twelve_students(db: Session) -> None:
    for number in range(1, 13):
        _student(db, f"Pager{number:02d}", "Zzfamily", f"PG{number:02d}")
    _student(db, "Someone", "Else", "OTHER1")


class TestPaging:
    def test_page_and_page_size_of_the_body_are_read(self, client, admin_headers, twelve_students):
        body = {"entity": "students", "query": "Zzfamily", "page_size": 10}

        first = _search(client, admin_headers, {**body, "page": 0})["data"]
        second = _search(client, admin_headers, {**body, "page": 1})["data"]

        assert len(first["results"]) == 10
        assert len(second["results"]) == 2
        assert (first["page"], first["page_size"], first["limit"], first["offset"]) == (0, 10, 10, 0)
        assert (second["page"], second["page_size"], second["limit"], second["offset"]) == (1, 10, 10, 10)

        # The two pages are the twelve, each once.
        numbers = [row["student_id"] for row in first["results"] + second["results"]]
        assert sorted(numbers) == [f"PG{n:02d}" for n in range(1, 13)]

    def test_total_is_the_number_of_matches_not_of_the_page(self, client, admin_headers, twelve_students):
        body = {"entity": "students", "query": "Zzfamily", "page_size": 5}

        first = _search(client, admin_headers, {**body, "page": 0})["data"]
        last = _search(client, admin_headers, {**body, "page": 2})["data"]

        assert (len(first["results"]), first["total"], first["has_more"]) == (5, 12, True)
        assert (len(last["results"]), last["total"], last["has_more"]) == (2, 12, False)

    def test_a_page_past_the_end_is_empty_and_still_says_how_many_there_are(
        self, client, admin_headers, twelve_students
    ):
        data = _search(client, admin_headers, {"entity": "students", "query": "Zzfamily", "page_size": 10, "page": 5})

        assert data["data"]["results"] == []
        assert data["data"]["total"] == 12
        assert data["data"]["has_more"] is False

    def test_limit_and_offset_of_the_address_still_work(self, client, admin_headers, twelve_students):
        data = _search(client, admin_headers, {"entity": "students", "query": "Zzfamily"}, "?limit=4&offset=8")["data"]

        assert len(data["results"]) == 4
        assert (data["limit"], data["offset"], data["total"], data["has_more"]) == (4, 8, 12, False)

    @pytest.mark.parametrize("field,value", [("page_size", 0), ("page_size", 101), ("page_size", "ten"), ("page", -1)])
    def test_paging_that_cannot_be_is_refused(self, client, admin_headers, twelve_students, field, value):
        payload = _search(client, admin_headers, {"entity": "students", "query": "Zzfamily", field: value})

        assert payload["success"] is False
        assert payload["error"]["code"] == "INVALID_PAGINATION"


class TestOrder:
    def test_students_by_name_both_ways(self, client, admin_headers, four_students):
        body = {"entity": "students", "query": "o"}  # in all four: a name or the ".com"

        ascending = _search(client, admin_headers, {**body, "sort": {"field": "name", "direction": "asc"}})
        descending = _search(client, admin_headers, {**body, "sort": {"field": "name", "direction": "desc"}})

        assert _names(ascending) == ["Alice Johnson", "Bob Williams", "Jane Smith", "John Doe"]
        assert _names(descending) == ["John Doe", "Jane Smith", "Bob Williams", "Alice Johnson"]
        assert ascending["data"]["sort"] == {"field": "name", "direction": "asc"}

    def test_students_by_email(self, client, admin_headers, db):
        _student(db, "Anna", "Last", "E1", email="zeta@example.com")
        _student(db, "Zoe", "First", "E2", email="Alpha@example.com")

        body = {"entity": "students", "query": "example.com", "sort": {"field": "email", "direction": "asc"}}
        assert _names(_search(client, admin_headers, body)) == ["Zoe First", "Anna Last"]

    def test_relevance_puts_a_name_that_starts_with_the_text_first(self, client, admin_headers, db):
        _student(db, "Zed", "Bjohnson", "R1")  # contains
        _student(db, "Mark", "Other", "R2", email="john.elsewhere@example.com")  # found by the e-mail only
        _student(db, "John", "Adams", "R3")  # starts with

        best_first = _search(client, admin_headers, {"entity": "students", "query": "john"})
        worst_first = _search(
            client,
            admin_headers,
            {"entity": "students", "query": "john", "sort": {"field": "relevance", "direction": "asc"}},
        )

        assert _names(best_first) == ["John Adams", "Zed Bjohnson", "Mark Other"]
        assert _names(worst_first) == ["Mark Other", "Zed Bjohnson", "John Adams"]
        assert best_first["data"]["sort"] == {"field": "relevance", "direction": "desc"}

    def test_the_order_holds_across_pages(self, client, admin_headers, twelve_students):
        body = {
            "entity": "students",
            "query": "Zzfamily",
            "page_size": 5,
            "sort": {"field": "name", "direction": "desc"},
        }

        seen: list[str] = []
        for page in range(3):
            seen += _names(_search(client, admin_headers, {**body, "page": page}))

        assert seen == [f"Pager{n:02d} Zzfamily" for n in range(12, 0, -1)]

    def test_courses_by_name(self, client, admin_headers, db):
        db.add_all(
            [
                Course(course_code="B200", course_name="beta studies", semester="Fall"),
                Course(course_code="A100", course_name="Alpha Studies", semester="Fall"),
            ]
        )
        db.commit()
        body = {"entity": "courses", "query": "studies"}

        ascending = _search(client, admin_headers, {**body, "sort": {"field": "name", "direction": "asc"}})
        descending = _search(client, admin_headers, {**body, "sort": {"field": "name", "direction": "desc"}})

        assert [row["course_code"] for row in ascending["data"]["results"]] == ["A100", "B200"]
        assert [row["course_code"] for row in descending["data"]["results"]] == ["B200", "A100"]

    def test_grades_by_date_with_the_undated_last(self, client, admin_headers, db):
        student = _student(db, "Grade", "Owner", "G1")
        course = Course(course_code="G100", course_name="Graded", semester="Fall")
        db.add(course)
        db.commit()
        db.add_all(
            [
                Grade(
                    student_id=student.id,
                    course_id=course.id,
                    assignment_name="Quiz old",
                    grade=10,
                    max_grade=20,
                    date_assigned=date(2026, 1, 10),
                ),
                Grade(
                    student_id=student.id, course_id=course.id, assignment_name="Quiz undated", grade=11, max_grade=20
                ),
                Grade(
                    student_id=student.id,
                    course_id=course.id,
                    assignment_name="Quiz new",
                    grade=12,
                    max_grade=20,
                    date_submitted=date(2026, 3, 5),
                ),
            ]
        )
        db.commit()
        body = {"entity": "grades", "query": "Quiz"}

        newest = _search(client, admin_headers, {**body, "sort": {"field": "date", "direction": "desc"}})["data"][
            "results"
        ]
        oldest = _search(client, admin_headers, {**body, "sort": {"field": "date", "direction": "asc"}})["data"][
            "results"
        ]

        assert [row["assignment_name"] for row in newest] == ["Quiz new", "Quiz old", "Quiz undated"]
        assert [row["assignment_name"] for row in oldest] == ["Quiz old", "Quiz new", "Quiz undated"]
        # What the page shows of a grade: whose it is, the mark out of what, and the day.
        assert newest[0]["student_name"] == "Grade Owner"
        assert (newest[0]["grade"], newest[0]["max_grade"], newest[0]["date"]) == (12.0, 20.0, "2026-03-05")

    @pytest.mark.parametrize(
        "entity,sort",
        [
            ("students", {"field": "date", "direction": "asc"}),
            ("courses", {"field": "email", "direction": "asc"}),
            ("grades", {"field": "email", "direction": "asc"}),
            ("students", {"field": "created_at", "direction": "desc"}),
            ("students", {"field": "name", "direction": "sideways"}),
        ],
    )
    def test_an_order_that_does_not_exist_is_refused_not_ignored(
        self, client, admin_headers, four_students, entity, sort
    ):
        payload = _search(client, admin_headers, {"entity": entity, "query": "o", "sort": sort})

        assert payload["success"] is False
        assert payload["error"]["code"] == "INVALID_SORT"


class TestFilters:
    @pytest.fixture
    def mixed_students(self, db: Session) -> None:
        _student(db, "Mia", "Filter", "F1", is_active=True, study_year=1, enrollment_date=date(2025, 9, 1))
        _student(db, "Mio", "Filter", "F2", is_active=True, study_year=2, enrollment_date=date(2026, 9, 1))
        _student(db, "Mit", "Filter", "F3", is_active=False, study_year=2, enrollment_date=date(2026, 9, 15))

    def _numbers(self, client, headers, filters: dict) -> list[str]:
        payload = _search(client, headers, {"entity": "students", "query": "Filter", "filters": filters})
        assert payload["success"] is True, payload
        return sorted(row["student_id"] for row in payload["data"]["results"])

    def test_status(self, client, admin_headers, mixed_students):
        assert self._numbers(client, admin_headers, {"status": "active"}) == ["F1", "F2"]
        assert self._numbers(client, admin_headers, {"status": ["inactive"]}) == ["F3"]
        # Both boxes ticked: either, which is all of them. It used to answer with none.
        assert self._numbers(client, admin_headers, {"status": ["active", "inactive"]}) == ["F1", "F2", "F3"]

    def test_study_year_as_the_filter_panel_sends_it(self, client, admin_headers, mixed_students):
        assert self._numbers(client, admin_headers, {"enrollment_type": "year_2"}) == ["F2", "F3"]
        assert self._numbers(client, admin_headers, {"enrollment_type": ["year_1", "year_2"]}) == ["F1", "F2", "F3"]
        assert self._numbers(client, admin_headers, {"study_year": 1}) == ["F1"]

    def test_enrollment_year(self, client, admin_headers, mixed_students):
        assert self._numbers(client, admin_headers, {"enrollment_year": "2026"}) == ["F2", "F3"]
        assert self._numbers(client, admin_headers, {"enrollment_year": ["2025", "2026"]}) == ["F1", "F2", "F3"]

    def test_filters_of_different_kinds_must_all_hold(self, client, admin_headers, mixed_students):
        assert self._numbers(client, admin_headers, {"status": "active", "enrollment_type": "year_2"}) == ["F2"]

    def test_a_filter_value_that_means_nothing_is_refused(self, client, admin_headers, mixed_students):
        for filters in ({"status": "graduated"}, {"enrollment_type": "year_two"}, {"enrollment_year": "soon"}):
            payload = _search(client, admin_headers, {"entity": "students", "query": "Filter", "filters": filters})
            assert payload["success"] is False, filters
            assert payload["error"]["code"] == "INVALID_FILTER", filters

    def test_course_filters_as_the_filter_panel_sends_them(self, client, admin_headers, db):
        db.add_all(
            [
                Course(course_code="CF1", course_name="Filter One", semester="Fall 2026", credits=3),
                Course(course_code="CF2", course_name="Filter Two", semester="Spring 2027", credits=4),
                Course(course_code="CF3", course_name="Filter Three", semester="Spring 2027", credits=3),
            ]
        )
        db.commit()

        def codes(filters: dict) -> list[str]:
            payload = _search(client, admin_headers, {"entity": "courses", "query": "Filter", "filters": filters})
            assert payload["success"] is True, payload
            return sorted(row["course_code"] for row in payload["data"]["results"])

        assert codes({"credits": "3"}) == ["CF1", "CF3"]  # the panel sends the number as text
        assert codes({"credits": ["3", "4"]}) == ["CF1", "CF2", "CF3"]
        assert codes({"semester": "Spring 2027"}) == ["CF2", "CF3"]
        assert codes({"semester": ["Spring 2027"], "credits": "3"}) == ["CF3"]

    def test_the_total_counts_what_the_filters_leave(self, client, admin_headers, mixed_students):
        payload = _search(
            client,
            admin_headers,
            {"entity": "students", "query": "Filter", "filters": {"status": "active"}, "page_size": 1},
        )

        assert len(payload["data"]["results"]) == 1
        assert payload["data"]["total"] == 2


class TestTypedText:
    def test_a_greek_name_is_found_whatever_the_case(self, client, admin_headers, db):
        _student(db, "Γιάννης", "Παπαδόπουλος", "GR1")
        _student(db, "ΜΑΡΙΑ", "ΓΕΩΡΓΙΟΥ", "GR2")

        def found(query: str) -> list[str]:
            return [
                row["student_id"]
                for row in _search(client, admin_headers, {"entity": "students", "query": query})["data"]["results"]
            ]

        assert found("Γιάννης") == ["GR1"]
        assert found("γιάννης") == ["GR1"]
        assert found("ΓΙΆΝΝΗΣ") == ["GR1"]
        assert found("παπαδ") == ["GR1"]
        assert found("μαρια") == ["GR2"]

    def test_a_greek_name_is_found_with_or_without_its_accents(self, client, admin_headers, db):
        _student(db, "Γιάννης", "Παπαδόπουλος", "GA1")
        _student(db, "ΜΑΡΙΑ", "ΓΕΩΡΓΙΟΥ", "GA2")  # capitals are written without accents
        _student(db, "Αϊσέ", "Ταΐρ", "GA3")

        def found(query: str) -> list[str]:
            return [
                row["student_id"]
                for row in _search(client, admin_headers, {"entity": "students", "query": query})["data"]["results"]
            ]

        assert found("Γεωργίου") == ["GA2"]
        assert found("Μαρία") == ["GA2"]
        assert found("ΓΙΑΝΝΗΣ") == ["GA1"]
        assert found("γιαννης") == ["GA1"]
        assert found("παπαδοπουλος") == ["GA1"]
        assert found("αισε") == ["GA3"]
        assert found("ΤΑΙΡ") == ["GA3"]

    def test_a_surname_in_capitals_is_found_when_typed_in_full(self, client, admin_headers, db):
        # PostgreSQL lowers the last letter of ΠΑΠΑΔΟΠΟΥΛΟΣ to "σ", Python lowers it to "ς":
        # on the shared database the whole surname, typed in any case, found nobody.
        _student(db, "ΝΙΚΟΣ", "ΠΑΠΑΔΟΠΟΥΛΟΣ", "GS1")
        _student(db, "Κώστας", "Σωτηρίου", "GS2")

        def found(query: str) -> list[str]:
            return [
                row["student_id"]
                for row in _search(client, admin_headers, {"entity": "students", "query": query})["data"]["results"]
            ]

        assert found("ΠΑΠΑΔΟΠΟΥΛΟΣ") == ["GS1"]
        assert found("Παπαδόπουλος") == ["GS1"]
        assert found("παπαδοπουλος") == ["GS1"]
        assert found("νικος") == ["GS1"]
        assert found("ΚΩΣΤΑΣ") == ["GS2"]
        assert found("κωστασ") == ["GS2"]
        # A sigma inside a word is one, whichever way it is typed.
        assert found("σωτ") == ["GS2"]

    def test_what_is_compared(self):
        assert fold_text("ΠΑΠΑΔΟΠΟΥΛΟΣ") == fold_text("Παπαδόπουλος") == "παπαδοπουλοσ"
        assert fold_text("Άννα ΐ ΰ Ϋ Ϊ") == "αννα ι υ υ ι"
        assert fold_text("John O'Neil") == "john o'neil"

    def test_greek_names_are_ordered_without_regard_to_case(self, client, admin_headers, db):
        _student(db, "βασίλης", "Τεστ", "GO1")
        _student(db, "Άννα", "Τεστ", "GO2")
        _student(db, "Γιώργος", "Τεστ", "GO3")

        payload = _search(
            client,
            admin_headers,
            {"entity": "students", "query": "Τεστ", "sort": {"field": "name", "direction": "asc"}},
        )

        # SQLite puts every capital before every small letter: Γιώργος came before βασίλης.
        numbers = [row["student_id"] for row in payload["data"]["results"]]
        assert numbers.index("GO1") < numbers.index("GO3")

    def test_an_accent_does_not_move_a_greek_name_in_the_list(self, client, admin_headers, db):
        # By the code of the letters "ό" comes after "ω" and "ά" before "α".
        for number, first in enumerate(["Πέτρος", "Όλγα", "Νίκος", "Άννα", "Αλέξης", "Ωραία"], start=1):
            _student(db, first, "Σειρά", f"GT{number}")

        payload = _search(
            client,
            admin_headers,
            {"entity": "students", "query": "Σειρά", "sort": {"field": "name", "direction": "asc"}},
        )

        assert [row["first_name"] for row in payload["data"]["results"]] == [
            "Αλέξης",
            "Άννα",
            "Νίκος",
            "Όλγα",
            "Πέτρος",
            "Ωραία",
        ]

    def test_percent_and_underscore_are_text_not_wildcards(self, client, admin_headers, four_students, db):
        _student(db, "Fifty%", "Percent", "W1")
        _student(db, "Under_score", "Name", "W2")

        def found(query: str) -> list[str]:
            return [
                row["student_id"]
                for row in _search(client, admin_headers, {"entity": "students", "query": query})["data"]["results"]
            ]

        assert found("%") == ["W1"]  # it matched every student
        assert found("_") == ["W2"]
        assert found("y%") == ["W1"]

    def test_text_around_the_query_is_trimmed(self, client, admin_headers, four_students):
        assert _names(_search(client, admin_headers, {"entity": "students", "query": "  Doe  "})) == ["John Doe"]


class TestFacets:
    def test_the_counts_are_of_what_the_search_finds(self, client, admin_headers, db):
        _student(db, "Nora", "Facet", "FC1", is_active=True, study_year=1)
        _student(db, "Nick", "Facet", "FC2", is_active=False, study_year=1)
        _student(db, "Other", "Person", "FC3", is_active=True, study_year=2)

        def facets(query: str) -> tuple[dict, int]:
            response = client.get("/api/v1/search/students/facets", params={"q": query}, headers=admin_headers)
            assert response.status_code == 200, response.text
            data = response.json()["data"]
            return {f["name"]: {v["value"]: v["count"] for v in f["values"]} for f in data["facets"]}, data[
                "total_results"
            ]

        by_name, total = facets("Facet")
        assert total == 2
        assert by_name["status"] == {"active": 1, "inactive": 1}
        assert by_name["enrollment_type"] == {"year_1": 2}

        # Found by the student number too, as the search itself does.
        by_number, total = facets("FC3")
        assert total == 1
        assert by_number["status"] == {"active": 1}
        assert by_number["enrollment_type"] == {"year_2": 1}

    def test_every_count_is_what_a_search_with_that_filter_returns(self, client, admin_headers, db):
        _student(db, "Ria", "Round", "RT1", is_active=True, study_year=1, enrollment_date=date(2025, 9, 1))
        _student(db, "Rob", "Round", "RT2", is_active=True, study_year=2, enrollment_date=date(2026, 9, 1))
        _student(db, "Rea", "Round", "RT3", is_active=False, study_year=2, enrollment_date=date(2026, 9, 1))
        _student(db, "Not", "Counted", "RT4", is_active=False, study_year=3, enrollment_date=date(2024, 9, 1))

        response = client.get("/api/v1/search/students/facets", params={"q": "Round"}, headers=admin_headers)
        facets = response.json()["data"]["facets"]
        assert {f["name"] for f in facets} == {"status", "enrollment_type", "enrollment_year"}

        checked = 0
        for facet in facets:
            for value in facet["values"]:
                payload = _search(
                    client,
                    admin_headers,
                    {"entity": "students", "query": "Round", "filters": {facet["name"]: value["value"]}},
                )
                assert payload["success"] is True, (facet["name"], value)
                assert payload["data"]["total"] == value["count"], (facet["name"], value)
                checked += 1
        assert checked == 6  # active, inactive; year_1, year_2; 2025, 2026

    def test_course_counts_follow_the_text_and_work_as_filters(self, client, admin_headers, db):
        db.add_all(
            [
                Course(course_code="FCA", course_name="Facet Algebra", semester="Fall 2026", credits=3),
                Course(course_code="FCB", course_name="Facet Biology", semester="Spring 2027", credits=4),
                Course(course_code="ZZZ", course_name="Unrelated", semester="Fall 2026", credits=5),
            ]
        )
        db.commit()

        response = client.get("/api/v1/search/courses/facets", params={"q": "Facet"}, headers=admin_headers)
        data = response.json()["data"]
        assert data["total_results"] == 2
        by_name = {f["name"]: {v["value"]: v["count"] for v in f["values"]} for f in data["facets"]}
        assert by_name == {"semester": {"Fall 2026": 1, "Spring 2027": 1}, "credits": {"3": 1, "4": 1}}

        for name, values in by_name.items():
            for value, count in values.items():
                payload = _search(
                    client, admin_headers, {"entity": "courses", "query": "Facet", "filters": {name: value}}
                )
                assert payload["data"]["total"] == count, (name, value)


class TestTheServiceItself:
    def test_a_search_that_fails_is_not_an_empty_one(self, db):
        service = SearchService(db)

        with pytest.raises(ValueError):
            service.advanced_search_page("teachers", {})
        with pytest.raises(ValueError):
            service.advanced_search_page("students", {}, sort_field="date")
        with pytest.raises(ValueError):
            service.advanced_search_page("students", {"status": "graduated"})

    def test_the_endpoint_says_so_when_the_search_fails(self, client, admin_headers, monkeypatch):
        def broken(self, *args, **kwargs):
            raise RuntimeError("the database went away")

        monkeypatch.setattr(SearchService, "advanced_search_page", broken)
        payload = _search(client, admin_headers, {"entity": "students", "query": "anything"})

        assert payload["success"] is False
        assert payload["error"]["code"] == "SEARCH_ERROR"
        assert payload["data"] is None

    def test_the_filters_of_the_caller_are_left_as_they_were(self, db, four_students):
        filters = {"_query_text": "john", "status": ["active"]}
        SearchService(db).advanced_search_page("students", filters)

        assert filters == {"_query_text": "john", "status": ["active"]}

    def test_advanced_filter_is_the_same_search(self, db, four_students):
        service = SearchService(db)

        rows = service.advanced_filter({"_query_text": "o"}, search_type="students", limit=2, offset=1)

        # Best match first: Alice, Bob and John have an "o" in a name, Jane only in ".com".
        assert [row["first_name"] for row in rows] == ["Bob", "John"]
        assert service.advanced_filter({"status": "graduated"}, search_type="students") == []


class TestLowerOnSqlite:
    def test_lower_knows_every_letter(self):
        assert unicode_lower("ΓΙΆΝΝΗΣ Smith") == "γιάννης smith"
        assert unicode_lower(None) is None
        assert unicode_lower(12) == "12"
        assert unicode_lower(b"RAW") == b"RAW"

    def test_translate_is_the_one_of_postgresql(self):
        assert sql_translate("12345", "143", "ax") == "a2x5"  # the PostgreSQL manual's example
        assert sql_translate("άννα", "άά", "αβ") == "αννα"  # the first mention of a letter counts
        assert sql_translate(None, "a", "b") is None
        assert sql_translate("abc", None, "b") is None
        assert sql_translate(42, "4", "7") == "72"

    def test_the_test_database_has_both(self, db):
        assert db.execute(text("SELECT lower('Γιάννης ΠΑΠΑΔΌΠΟΥΛΟΣ')")).scalar() == "γιάννης παπαδόπουλος"
        assert db.execute(text("SELECT lower(NULL)")).scalar() is None
        assert db.execute(text("SELECT translate(lower('ΌΛΓΑ'), 'ός', 'οσ')")).scalar() == "ολγα"

    def test_an_engine_made_anywhere_has_both(self):
        # Several test files and tools make an engine of their own. A search through such an
        # engine must find the same as through the application's.
        from sqlalchemy import create_engine

        engine = create_engine("sqlite://")
        try:
            with engine.connect() as connection:
                assert connection.execute(text("SELECT lower('ΆΝΝΑ')")).scalar() == "άννα"
                assert connection.execute(text("SELECT translate('άννα', 'ά', 'α')")).scalar() == "αννα"
        finally:
            engine.dispose()

    def test_the_engine_of_the_application_has_it_on_every_connection(self, tmp_path):
        from backend.models import init_db

        engine = init_db("sqlite:///" + (tmp_path / "lower.db").as_posix())
        try:
            for _ in range(2):  # the engine opens a new connection each time (NullPool)
                with engine.connect() as connection:
                    assert connection.execute(text("SELECT lower('ΆΝΝΑ')")).scalar() == "άννα"
                    assert connection.execute(text("SELECT translate('άννα', 'ά', 'α')")).scalar() == "αννα"
        finally:
            engine.dispose()

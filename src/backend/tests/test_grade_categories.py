"""The standard list of grade categories (plan todo 75): spellings fold into one key."""

import pytest

from backend.services import grade_categories as cats


@pytest.mark.parametrize(
    "name, key",
    [
        # The grading form's eight names and their Greek labels.
        ("Midterm Exam", "midterm"),
        ("Ενδιάμεση Εξέταση", "midterm"),
        ("Final Exam", "final"),
        ("Τελική Εξέταση", "final"),
        ("ΤΕΛΙΚΗ ΕΞΕΤΑΣΗ", "final"),
        ("Quizzes", "quiz"),
        ("Κουίζ", "quiz"),
        ("Lab Work", "lab"),
        ("Εργαστήριο", "lab"),
        ("Εργαστηριακή Εργασία", "lab"),
        ("Homework", "homework"),
        ("Homework/Assignments", "homework"),
        ("Εργασία", "homework"),
        ("Εκπόνηση Εργασιών", "homework"),
        ("Project", "project"),
        ("Πρότζεκτ", "project"),
        ("Class Participation", "participation"),
        ("Συμμετοχή στο Μάθημα", "participation"),
        ("Continuous Assessment", "continuous"),
        ("Συνεχής Αξιολόγηση", "continuous"),
        ("Presentation", "presentation"),
        # Other spellings seen in imports and custom rules.
        ("lab-work", "lab"),
        ("Διαγώνισμα", "quiz"),
        ("Midterm 2", "midterm"),
        ("Τελικό διαγώνισμα", "final"),
        # Mid-semester exams written in two words ("Mid-Term" folds to "mid term").
        ("Mid-Term Exam", "midterm"),
        ("Mid term test", "midterm"),
        ("Mid-semester Exam", "midterm"),
        ("Midsemester Exam", "midterm"),
        ("Εξέταση Μέσου Εξαμήνου", "midterm"),
        # Coursework before the exams, as the final grade reads it (the owner, 2026-11-23: a final
        # project is coursework, not the final exam).
        ("Τελική Εργασία", "homework"),
        ("Ενδιάμεση Εργασία", "homework"),
        ("Final Project", "project"),
        ("Mid-Term Project", "project"),
        # The final grade's quiz words before the exams too (plan todo 86).
        ("Final Quiz", "quiz"),
        ("Τελικό Τεστ", "quiz"),
        # An exam the name does not place in the semester is not a final exam.
        ("Exam", "exam"),
        ("Εξέταση", "exam"),
        ("Θεωρητική Εξέταση", "exam"),
        ("Πρακτική Εξέταση", "exam"),
        ("Written Exam", "exam"),
        # Attendance is its own category, as in the final grade's calculation.
        ("Attendance", "attendance"),
        ("Παρουσία", "attendance"),
        ("Παρουσίες", "attendance"),
    ],
)
def test_known_spellings_fold_into_one_key(name, key):
    assert cats.canonical_category(name) == key


@pytest.mark.parametrize(
    "name, key",
    [
        # "Παρουσίαση" (presentation) is not "Παρουσία" (attendance), not even in the genitive,
        # which casefold makes "παρουσιασ" (todo 77 point 2's review).
        ("Παρουσίαση", "presentation"),
        ("Παρουσιάσεις", "presentation"),
        ("Ποσοστό Παρουσίας", "attendance"),
        ("ΠΑΡΟΥΣΙΑΣ", "attendance"),
        # A lab, abbreviated or not.
        ("Εργαστ. Ασκήσεις", "lab"),
        # The more specific word wins.
        ("Final Project", "project"),
        ("Τελική εργασία", "homework"),
        ("Εργαστηριακή εξέταση", "lab"),
        # A word has to start with the needle: "collaboration" is not a lab.
        ("Collaboration", None),
        # The work placement is not homework ("άσκηση" alone is an exercise).
        ("Πρακτική Άσκηση", None),
        ("Internship", None),
    ],
)
def test_words_that_look_alike(name, key):
    assert cats.canonical_category(name) == key


@pytest.mark.parametrize("name", ["No participation", "Minor participation", "Minor participation (mobile usage)"])
def test_participation_observations_are_not_class_participation(name):
    # They are deductions ticked in Attendance; folding them in would mix ticks with scores.
    assert cats.is_participation_observation(name)
    assert cats.canonical_category(name) is None


def test_an_unknown_name_keeps_its_own_name_and_group():
    assert cats.canonical_category("Οπτικοποίηση") is None
    assert cats.category_label("  Οπτικοποίηση ", "el") == "Οπτικοποίηση"
    assert cats.group_key("Οπτικοποίηση") == "custom:οπτικοποιηση"
    assert cats.group_key("ΟΠΤΙΚΟΠΟΙΗΣΗ") == cats.group_key("Οπτικοποίηση")
    assert cats.canonical_category(None) is None
    assert cats.canonical_category("  ") is None


def test_labels_in_both_languages():
    # The grading form's own words (grades.js): "Εργαστήριο", "Εργασία".
    assert cats.category_label("Εργαστήριο", "en") == "Lab Work"
    assert cats.category_label("Lab Work", "el") == "Εργαστήριο"
    assert cats.category_label("Homework/Assignments", "el") == "Εργασία"
    assert cats.category_label("Midterm", "el") == "Ενδιάμεση Εξέταση"
    assert cats.category_label("Lab Work", "fr") == "Lab Work"  # unknown language: English
    assert set(cats.LABELS["en"]) == set(cats.LABELS["el"]) == set(cats.CATEGORY_KEYS)


def test_only_a_standard_name_is_translated():
    # A course's own rule names stay as typed: translating "Θεωρητική Εξέταση" and
    # "Πρακτική Εξέταση" to one label would print two different rules under one title.
    assert cats.category_label("Θεωρητική Εξέταση", "en") == "Θεωρητική Εξέταση"
    assert cats.category_label("Midterm 1", "el") == "Midterm 1"
    assert cats.category_label("Attendance", "el") == "Παρουσία"
    assert cats.standard_key("Θεωρητική Εξέταση") is None
    assert cats.standard_key("  lab WORK ") == "lab"
    # A group merged under a standard key takes its label; any other group keeps its name.
    assert cats.group_label("lab", "Εργαστήριο", "en") == "Lab Work"
    assert cats.group_label("custom:οπτικοποιηση", "Οπτικοποίηση", "en") == "Οπτικοποίηση"


def test_within_a_course_only_spellings_of_a_standard_name_are_one_category():
    # The grade sheets group by exact_key: what the teacher kept apart stays apart.
    assert cats.exact_key("Lab Work") == cats.exact_key("Εργαστήριο") == cats.exact_key(" lab work ") == "lab"
    assert cats.exact_key("Θεωρητική Εξέταση") != cats.exact_key("Πρακτική Εξέταση")
    assert cats.exact_key("Written Exam") != cats.exact_key("Oral Exam")
    assert cats.exact_key("C++") != cats.exact_key("C#")
    assert cats.exact_key(None) == "custom:"
    # Across courses group_key still folds both exams into one key, but keeps a custom name's symbols.
    assert cats.group_key("Θεωρητική Εξέταση") == cats.group_key("Πρακτική Εξέταση") == "exam"
    assert cats.group_key("C++") != cats.group_key("C#")


def test_fold_name_keeps_symbols():
    assert cats.fold_name("  C++   Project ") == "c++ project"
    assert cats.fold_name("Άσκηση_1") == cats.fold_name("άσκηση 1") == "ασκηση 1"
    assert cats.fold_name("Lab-1") != cats.fold_name("Lab 1")


def test_fold_drops_accents_case_and_punctuation():
    assert cats.fold("  Τελική-Εξέταση (Α') ") == "τελικη εξεταση α"
    assert cats.fold("ΓΙΏΡΓΟΣ") == cats.fold("Γιώργος") == "γιωργοσ"


def test_display_order_puts_standard_categories_first():
    keys = ["custom:zeta", "participation", "custom:alpha", "midterm", "lab"]
    assert sorted(keys, key=cats.sort_position) == ["midterm", "lab", "participation", "custom:alpha", "custom:zeta"]

from __future__ import annotations

import pytest

from backend.routers import routers_courses


@pytest.mark.parametrize(
    "input_rules, expected",
    [
        (None, None),
        ([], []),
        (
            {"category": "Project", "weight": 30},
            [{"category": "Project", "weight": 30}],
        ),
    ],
)
def test_normalize_evaluation_rules_simple_cases(input_rules, expected):
    assert routers_courses._normalize_evaluation_rules(input_rules) == expected


def test_normalize_evaluation_rules_extracts_weight_from_text():
    raw = [
        {"category": "Midterm : 40%", "weight": None},
        {"category": "Final Exam", "weight": 60},
    ]
    normalized = routers_courses._normalize_evaluation_rules(raw)
    assert normalized is not None
    assert normalized[0]["category"] == "Midterm"
    assert normalized[0]["weight"] == pytest.approx(40.0)
    assert normalized[1]["weight"] == 60


def test_normalize_evaluation_rules_from_pair_sequence():
    raw = ["Quiz", "25%", "Final", 75]
    normalized = routers_courses._normalize_evaluation_rules(raw)
    assert normalized is not None
    assert normalized == [
        {"category": "Quiz", "weight": pytest.approx(25.0)},
        {"category": "Final", "weight": pytest.approx(75.0)},
    ]


def test_normalize_evaluation_rules_from_string_entries():
    raw = [
        {"category": "Lab - 10%", "weight": 0},
        {"category": "Homework: 20", "weight": None},
        {"category": "Participation, 15"},
    ]
    normalized = routers_courses._normalize_evaluation_rules(raw)
    assert normalized is not None
    weights = [item["weight"] for item in normalized]
    assert weights == [10.0, 20.0, 15.0]


def test_normalize_evaluation_rules_fallback_to_zero_weight():
    raw = ["Standalone", object()]
    normalized = routers_courses._normalize_evaluation_rules(raw)
    assert normalized is not None
    assert normalized[-1] == {"category": "Standalone", "weight": 0.0}


def test_normalize_evaluation_rules_handles_invalid_payload_gracefully():
    class BadList(list):
        def __iter__(self):  # pragma: no cover - defensive guard in function
            raise RuntimeError("boom")

    result = routers_courses._normalize_evaluation_rules(BadList([1, 2, 3]))
    assert result == []

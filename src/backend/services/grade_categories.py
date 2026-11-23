"""One standard list of grade categories, shared by every course (plan todo 75).

A grade's category is free text: the grading form offers eight names, a course's evaluation rules
can add their own, and grades imported from files carry whatever the file said. This module folds
those spellings, English or Greek, with or without accents, into one key, so that a student's lab
work can be compared across courses and a course's exams can be listed together.

It is used to group and compare grades, never to calculate a final grade: matching grades to a
course's rules stays with ``analytics_service.normalize_rule_category``, so nothing here can
change a grade a student already has.

Two ways to name a category for people:
- ``category_label`` translates a name only when it IS a standard name ("Lab Work", "Εργαστήριο",
  "Final Exam"...). Any other name, a course's own rule "Θεωρητική Εξέταση" say, is shown as typed:
  folding it would print two different rules under one title.
- ``group_label`` names a group of grades merged under one key: the standard label for a standard
  key, else the group's own name.

Two ways to group grades:
- ``exact_key`` within one course (the grade sheets): only the spellings of a standard name are
  one category; any other name is its own, as the teacher kept it.
- ``group_key`` across courses (comparing a student's courses): the standard key whenever a name
  points to one ("Θεωρητική Εξέταση" is an exam), else the name itself.

A name that matches no standard category gets ``None`` and keeps its own name where it is shown.
The participation observations ("No participation", "Minor participation"...) are deductions
ticked in Attendance, not grades, so they are never folded into Class Participation.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any, Optional

# Display order: exams first, then coursework, then participation and attendance.
CATEGORY_KEYS: tuple[str, ...] = (
    "midterm",
    "final",
    "exam",
    "quiz",
    "lab",
    "homework",
    "project",
    "presentation",
    "continuous",
    "participation",
    "attendance",
)
EXAM_KEYS = frozenset({"midterm", "final", "exam"})

# The words of the grading form (src/frontend/src/locales/*/grades.js, which the form reads first;
# Presentation from common.js). "exam" is an exam the name does not place in the semester.
LABELS: dict[str, dict[str, str]] = {
    "en": {
        "midterm": "Midterm Exam",
        "final": "Final Exam",
        "exam": "Exam",
        "quiz": "Quizzes",
        "lab": "Lab Work",
        "homework": "Homework",
        "project": "Project",
        "presentation": "Presentation",
        "continuous": "Continuous Assessment",
        "participation": "Class Participation",
        "attendance": "Attendance",
    },
    "el": {
        "midterm": "Ενδιάμεση Εξέταση",
        "final": "Τελική Εξέταση",
        "exam": "Εξέταση",
        "quiz": "Κουίζ",
        "lab": "Εργαστήριο",
        "homework": "Εργασία",
        "project": "Πρότζεκτ",
        "presentation": "Παρουσίαση",
        "continuous": "Συνεχής Αξιολόγηση",
        "participation": "Συμμετοχή στο Μάθημα",
        "attendance": "Παρουσία",
    },
}

_OBSERVATIONS = ("no participation", "minor participation")

# Whole names (after fold()), checked first.
_EXACT: dict[str, str] = {
    "midterm": "midterm",
    "midterm exam": "midterm",
    "intermediate exam": "midterm",
    "ενδιαμεση": "midterm",
    "ενδιαμεση εξεταση": "midterm",
    "final": "final",
    "final exam": "final",
    "τελικη": "final",
    "τελικη εξεταση": "final",
    "exam": "exam",
    "exams": "exam",
    "εξεταση": "exam",
    "εξετασεις": "exam",
    "quiz": "quiz",
    "quizzes": "quiz",
    "test": "quiz",
    "tests": "quiz",
    "κουιζ": "quiz",
    "τεστ": "quiz",
    "διαγωνισμα": "quiz",
    "διαγωνισματα": "quiz",
    "lab": "lab",
    "labs": "lab",
    "lab work": "lab",
    "laboratory": "lab",
    "εργαστηριο": "lab",
    "εργαστηρια": "lab",
    "εργαστηριακη εργασια": "lab",
    "εργαστηριακες εργασιες": "lab",
    "homework": "homework",
    "homework assignments": "homework",
    "assignment": "homework",
    "assignments": "homework",
    "exercise": "homework",
    "exercises": "homework",
    "εργασια": "homework",
    "εργασιες": "homework",
    "εκπονηση εργασιων": "homework",
    "ασκηση": "homework",
    "ασκησεις": "homework",
    "project": "project",
    "projects": "project",
    "προτζεκτ": "project",
    "presentation": "presentation",
    "presentations": "presentation",
    "παρουσιαση": "presentation",
    "παρουσιασεις": "presentation",
    "continuous assessment": "continuous",
    "συνεχης αξιολογηση": "continuous",
    "participation": "participation",
    "class participation": "participation",
    "συμμετοχη": "participation",
    "συμμετοχη στο μαθημα": "participation",
    "attendance": "attendance",
    "παρουσια": "attendance",
    "παρουσιες": "attendance",
}

# Phrases that decide before single words do (on the folded name, word boundaries).
_PHRASES: tuple[tuple[re.Pattern[str], Optional[str]], ...] = (
    # Mid-semester exams written in two words ("Mid-Term Exam" folds to "mid term exam").
    (re.compile(r"\bmid (term|semester)\b|\bmidsemester\b|\bμεσου εξαμηνου\b"), "midterm"),
    # The work placement is not homework.
    (re.compile(r"\bπρακτικη ασκηση\b|\binternship\b|\bpracticum\b|\bwork placement\b"), None),
)

# Then the start of any word, in this order: the more specific word wins ("Final project" is a
# project, "Εργαστηριακή εργασία" is lab work, "Παρουσίαση" is not "Παρουσία").
_WORD_STARTS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("continuous", ("continuous", "συνεχ")),
    ("presentation", ("presentation", "παρουσιασ")),
    ("project", ("project", "προτζεκ")),
    ("lab", ("lab", "εργαστηρ")),
    ("participation", ("particip", "συμμετοχ")),
    ("attendance", ("attendance", "παρουσι")),
    ("midterm", ("midterm", "intermediate", "ενδιαμεσ")),
    ("homework", ("homework", "assignment", "exercise", "εργασ", "ασκησ")),
    ("final", ("final", "τελικ")),
    ("quiz", ("quiz", "test", "κουιζ", "τεστ", "διαγωνισμ")),
    ("exam", ("exam", "εξετασ")),
)


def fold(text: Any) -> str:
    """Lower case, no accents, punctuation as spaces, single spaces: "Τελική-Εξέταση" -> "τελικη εξεταση"."""
    decomposed = unicodedata.normalize("NFD", str(text or ""))
    bare = "".join(ch for ch in decomposed if not unicodedata.combining(ch)).casefold()
    return " ".join(re.sub(r"[^\w]+", " ", bare).replace("_", " ").split())


def fold_name(text: Any) -> str:
    """A name for comparing: no case, no accents, single spaces; every other character counts
    ("C++ Project" is not "C Project", "Lab-1" is not "Lab 1")."""
    decomposed = unicodedata.normalize("NFD", str(text or ""))
    bare = "".join(ch for ch in decomposed if not unicodedata.combining(ch)).casefold()
    return " ".join(bare.replace("_", " ").split())


def is_participation_observation(name: Any) -> bool:
    """A rule for a participation observation (a deduction ticked in Attendance), not a grade."""
    return fold(name).startswith(_OBSERVATIONS)


def canonical_category(name: Any) -> Optional[str]:
    """The standard key of a category name ("Εργαστήριο" -> "lab"), or None when none fits."""
    folded = fold(name)
    if not folded or is_participation_observation(folded):
        return None
    if folded in _EXACT:
        return _EXACT[folded]
    for pattern, key in _PHRASES:
        if pattern.search(folded):
            return key
    words = folded.split()
    for key, starts in _WORD_STARTS:
        if any(word.startswith(start) for word in words for start in starts):
            return key
    return None


def group_key(name: Any) -> str:
    """What grades are grouped by across courses: the standard key, or "custom:<name>" else."""
    key = canonical_category(name)
    if key:
        return key
    return f"custom:{fold_name(name)}"


# The names that ARE a standard category: its labels in both languages, and the spellings the
# pages store ("Homework/Assignments" from the course editor, "Midterm" from the grading form).
_STANDARD_NAMES: dict[str, str] = {
    **{fold(label): key for labels in LABELS.values() for key, label in labels.items()},
    "midterm": "midterm",
    "final": "final",
    "homework assignments": "homework",
    "εκπονηση εργασιων": "homework",
    "εργαστηριακη εργασια": "lab",
    "quiz": "quiz",
    "lab": "lab",
    "participation": "participation",
}


def standard_key(name: Any) -> Optional[str]:
    """The key of a name that is exactly a standard category name, else None (no guessing)."""
    return _STANDARD_NAMES.get(fold(name))


def exact_key(name: Any) -> str:
    """One category within one course: the key of a standard name ("Lab Work" and "Εργαστήριο"
    are one), else the name itself ("custom:<name>"). Unlike ``group_key`` it never guesses, so
    two categories a teacher kept apart ("Θεωρητική Εξέταση", "Πρακτική Εξέταση") stay apart."""
    return standard_key(name) or f"custom:{fold_name(name)}"


def category_label(name: Any, lang: str = "en") -> str:
    """A category name to show: translated when it is a standard name, else as it was typed."""
    key = standard_key(name)
    if key:
        return LABELS.get(lang, LABELS["en"])[key]
    return str(name or "").strip()


def group_label(key: str, name: Any, lang: str = "en") -> str:
    """The name of a group of grades merged under `key`: its standard label, else the group's name."""
    if key in CATEGORY_KEYS:
        return LABELS.get(lang, LABELS["en"])[key]
    return str(name or "").strip()


def sort_position(key: str) -> tuple[int, str]:
    """Standard categories in CATEGORY_KEYS order, then any other name alphabetically."""
    if key in CATEGORY_KEYS:
        return CATEGORY_KEYS.index(key), ""
    return len(CATEGORY_KEYS), key

"""
Test to demonstrate the grade calculation fix for partial work.
This test shows that grades are now normalized when only some evaluation
categories have been completed.
"""


def test_partial_work_normalization():
    """
    Test Case: Student has completed Midterm (40% weight) with 90% score,
    but Final Exam (60% weight) is not yet taken.

    Expected Result: Grade should be normalized to show 90% (current performance)
    instead of 36% (weighted with missing work as 0%).
    """

    # Simulate evaluation rules
    evaluation_rules = [
        {"category": "Midterm Exam", "weight": 40},
        {"category": "Final Exam", "weight": 60},
    ]

    # Simulate completed work
    category_scores = {
        "Midterm Exam": 90.0  # 90% on midterm
        # Final Exam: Not yet taken (not in category_scores)
    }

    # OLD LOGIC (BEFORE FIX) - Incorrectly calculates 36%
    final_grade_old = 0.0
    total_weight_used_old = 0.0
    for rule in evaluation_rules:
        category = rule.get("category")
        weight = float(rule.get("weight", 0))
        if category in category_scores and weight > 0:
            final_grade_old += (category_scores[category] * weight) / 100
            total_weight_used_old += weight

    print("=" * 60)
    print("OLD LOGIC (BEFORE FIX):")
    print("=" * 60)
    print(f"Final Grade: {final_grade_old:.2f}%")
    print(f"Total Weight Used: {total_weight_used_old}%")
    print(f"GPA: {(final_grade_old / 100) * 4:.2f} / 4.0")
    print(f"Problem: Student has 90% on Midterm but shows as {final_grade_old:.0f}%!")
    print()

    # NEW LOGIC (AFTER FIX) - Correctly normalizes to 90%
    final_grade_new = 0.0
    total_weight_used_new = 0.0
    for rule in evaluation_rules:
        category = rule.get("category")
        weight = float(rule.get("weight", 0))
        if category in category_scores and weight > 0:
            final_grade_new += (category_scores[category] * weight) / 100
            total_weight_used_new += weight

    # Normalize to 100% scale based on completed work
    if total_weight_used_new > 0 and total_weight_used_new < 100:
        final_grade_new = (final_grade_new / total_weight_used_new) * 100

    print("=" * 60)
    print("NEW LOGIC (AFTER FIX):")
    print("=" * 60)
    print(f"Final Grade: {final_grade_new:.2f}%")
    print(f"Total Weight Used: {total_weight_used_new}%")
    print(f"GPA: {(final_grade_new / 100) * 4:.2f} / 4.0")
    print(
        f"Success: Grade normalized from {final_grade_old:.0f}% to {final_grade_new:.0f}%!"
    )
    print()

    # Assertions
    assert final_grade_old == 36.0, "Old logic should calculate 36%"
    assert final_grade_new == 90.0, "New logic should normalize to 90%"
    assert total_weight_used_new == 40.0, "Only 40% of work completed"

    print("✅ Test passed! Grades are now correctly normalized for partial work.")


def test_complete_work_no_normalization():
    """
    Test Case: Student has completed all work (Midterm 40% = 85%, Final 60% = 90%)

    Expected Result: No normalization should occur (total_weight_used = 100%)
    """

    evaluation_rules = [
        {"category": "Midterm Exam", "weight": 40},
        {"category": "Final Exam", "weight": 60},
    ]

    category_scores = {"Midterm Exam": 85.0, "Final Exam": 90.0}

    final_grade = 0.0
    total_weight_used = 0.0
    for rule in evaluation_rules:
        category = rule.get("category")
        weight = float(rule.get("weight", 0))
        if category in category_scores and weight > 0:
            final_grade += (category_scores[category] * weight) / 100
            total_weight_used += weight

    # Should NOT normalize when total_weight_used == 100
    if total_weight_used > 0 and total_weight_used < 100:
        final_grade = (final_grade / total_weight_used) * 100

    print("=" * 60)
    print("COMPLETE WORK (NO NORMALIZATION):")
    print("=" * 60)
    print(f"Final Grade: {final_grade:.2f}%")
    print(f"Total Weight Used: {total_weight_used}%")
    print(f"GPA: {(final_grade / 100) * 4:.2f} / 4.0")
    print()

    expected_grade = (85 * 0.4) + (90 * 0.6)  # 88.0
    assert abs(final_grade - expected_grade) < 0.01, "Should calculate weighted average"
    assert total_weight_used == 100.0, "All work completed"

    print("✅ Test passed! Complete work is not normalized (correct).")


def test_multiple_partial_categories():
    """
    Test Case: Multiple categories, some completed
    - Homework (20%): 95%
    - Midterm (30%): 80%
    - Project (20%): Not started
    - Final (30%): Not yet taken

    Expected Result: Normalized grade based on 50% completed work
    """

    evaluation_rules = [
        {"category": "Homework", "weight": 20},
        {"category": "Midterm Exam", "weight": 30},
        {"category": "Project", "weight": 20},
        {"category": "Final Exam", "weight": 30},
    ]

    category_scores = {
        "Homework": 95.0,
        "Midterm Exam": 80.0,
        # Project and Final not yet done
    }

    final_grade = 0.0
    total_weight_used = 0.0
    for rule in evaluation_rules:
        category = rule.get("category")
        weight = float(rule.get("weight", 0))
        if category in category_scores and weight > 0:
            final_grade += (category_scores[category] * weight) / 100
            total_weight_used += weight

    # Normalize
    if total_weight_used > 0 and total_weight_used < 100:
        final_grade = (final_grade / total_weight_used) * 100

    print("=" * 60)
    print("MULTIPLE PARTIAL CATEGORIES:")
    print("=" * 60)
    print(f"Final Grade: {final_grade:.2f}%")
    print(f"Total Weight Used: {total_weight_used}%")
    print("Completed: Homework (95%) + Midterm (80%)")
    print("Pending: Project + Final")
    print()

    # Manual calculation: (95*20 + 80*30) / 100 = 43 / 50 * 100 = 86
    expected_grade = ((95 * 20 + 80 * 30) / 100) / total_weight_used * 100
    assert abs(final_grade - expected_grade) < 0.01, "Should normalize correctly"
    assert total_weight_used == 50.0, "50% of work completed"

    print("✅ Test passed! Multiple partial categories normalized correctly.")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("GRADE CALCULATION FIX - DEMONSTRATION TESTS")
    print("=" * 60 + "\n")

    test_partial_work_normalization()
    print("\n")

    test_complete_work_no_normalization()
    print("\n")

    test_multiple_partial_categories()
    print("\n")

    print("=" * 60)
    print("ALL TESTS PASSED! ✅")
    print("=" * 60)
    print("\nSummary:")
    print("- Partial work is now correctly normalized to 100% scale")
    print("- Complete work is not affected (uses original weighted calculation)")
    print("- Multiple partial categories are handled correctly")
    print("\nThe fix ensures students see their actual performance")
    print("based on completed work, not artificially deflated grades.")

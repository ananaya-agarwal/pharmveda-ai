from app.interactions.checker import check_interactions


def test_flags_known_interaction_pair():
    warnings = check_interactions(["Warfarin", "Aspirin"])
    assert len(warnings) == 1
    assert warnings[0].severity == "severe"


def test_matches_regardless_of_order():
    warnings_a = check_interactions(["Aspirin", "Warfarin"])
    warnings_b = check_interactions(["Warfarin", "Aspirin"])
    assert len(warnings_a) == len(warnings_b) == 1


def test_no_warning_for_unrelated_drugs():
    warnings = check_interactions(["Paracetamol", "Vitamin D"])
    assert warnings == []


def test_matches_case_insensitively_and_with_extra_text():
    warnings = check_interactions(["Tab. Warfarin 5mg", "Aspirin 75mg OD"])
    assert len(warnings) == 1

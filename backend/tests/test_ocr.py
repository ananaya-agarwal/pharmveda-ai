from app.ocr.extract import _fix_digit_confusions


def test_fixes_symbol_misread_as_zero_in_dosage():
    assert _fix_digit_confusions("Tab. Metformin 5@@mg twice daily") == "Tab. Metformin 500mg twice daily"


def test_fixes_letter_o_and_l_misreads_in_dosage():
    assert _fix_digit_confusions("Tab. Atorvastatin l0mg once daily") == "Tab. Atorvastatin 10mg once daily"
    assert _fix_digit_confusions("Tab. Lisinopril 1Omg once daily") == "Tab. Lisinopril 10mg once daily"


def test_leaves_ordinary_text_and_units_without_digits_untouched():
    text = "Follow up in 4 weeks. Dr. Anita Sharma, MBBS MD. mg is a unit."
    assert _fix_digit_confusions(text) == text


def test_leaves_correctly_read_dosages_untouched():
    text = "Tab. Aspirin 75mg once daily morning"
    assert _fix_digit_confusions(text) == text

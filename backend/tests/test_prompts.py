from app.llm.prompts import (
    DOCUMENT_EXPLANATION_SYSTEM_PROMPT,
    RAG_CHAT_SYSTEM_PROMPT,
    contains_banned_phrasing,
)


def test_system_prompts_instruct_against_diagnosis():
    for prompt in (DOCUMENT_EXPLANATION_SYSTEM_PROMPT, RAG_CHAT_SYSTEM_PROMPT):
        assert "never diagnose" in prompt.lower()
        assert "doctor" in prompt.lower()


def test_rag_prompt_restricts_to_provided_context():
    assert "only use the provided reference context" in RAG_CHAT_SYSTEM_PROMPT.lower()


def test_banned_phrasing_detector_catches_diagnostic_language():
    bad_response = "Based on your results, you have diabetes and you should take metformin."
    assert contains_banned_phrasing(bad_response)


def test_banned_phrasing_detector_allows_hedged_language():
    good_response = (
        "This lab value is often associated with reduced kidney function. "
        "Please discuss these results with your doctor."
    )
    assert contains_banned_phrasing(good_response) == []

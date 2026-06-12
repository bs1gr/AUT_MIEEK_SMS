from backend.error_messages import ErrorCode, create_error_detail, get_error_message


def test_get_error_message_default_en():
    message = get_error_message(ErrorCode.INVALID_INPUT)
    assert "Invalid input" in message


def test_get_error_message_greek_with_custom_detail():
    message = get_error_message(ErrorCode.INVALID_EMAIL, lang="el", custom_detail="bad")
    assert "Μη έγκυρη" in message
    assert "Details: bad" in message


def test_get_error_message_fallback_unknown_code():
    message = get_error_message("UNKNOWN_CODE")
    assert "unexpected error" in message.lower()


def test_create_error_detail_includes_kwargs():
    detail = create_error_detail(
        ErrorCode.INVALID_EMAIL,
        lang="en",
        custom_detail="bad",
        field="email",
    )
    assert detail["error_code"] == ErrorCode.INVALID_EMAIL
    assert "Invalid email" in detail["message"]
    assert "Details: bad" in detail["message"]
    assert detail["field"] == "email"

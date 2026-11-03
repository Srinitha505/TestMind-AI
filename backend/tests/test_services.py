from app.services import generate_test_cases, prioritise_cases, risk_score

def test_login_requirement_generates_auth_case():
    cases = generate_test_cases("A user can sign in with a valid email and password.")
    assert any("authentication" in case["category"].lower() for case in cases)

def test_payment_requirement_generates_payment_case():
    cases = generate_test_cases("A customer can complete checkout and payment.")
    assert any("payment" in case["title"].lower() for case in cases)

def test_priority_sorting():
    cases = [{"priority": "Low"}, {"priority": "Critical"}, {"priority": "High"}]
    result = prioritise_cases(cases)
    assert [x["priority"] for x in result] == ["Critical", "High", "Low"]

def test_risk_score_open_is_higher_than_resolved():
    assert risk_score("High", 0.8, "Open") > risk_score("High", 0.8, "Resolved")

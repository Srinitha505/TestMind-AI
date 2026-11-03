
def generate_test_cases(requirement: str):
    text = requirement.strip()
    lower = text.lower()
    cases = []

    def add(title, steps, expected, priority="Medium", category="Functional"):
        cases.append({
            "id": f"TC-{len(cases)+1:03d}",
            "title": title,
            "steps": steps,
            "expected_result": expected,
            "priority": priority,
            "category": category,
            "status": "Not Run"
        })

    if not text:
        return cases

    if any(k in lower for k in [
    "forgot password",
    "forgot my password",
    "forget my password",
    "reset password",
    "reset my password",
    "password reset",
    "password recovery",
    "recover password",
    "regain access"
]):
        add(
            "Verify password reset using a registered email",
            "1. Open the Forgot Password page. 2. Enter a registered email address. 3. Submit the request. 4. Open the received reset link. 5. Enter a valid new password and confirm it.",
            "The password is successfully updated and the user receives confirmation.",
            "Critical",
            "Authentication"
        )

        add(
            "Verify password reset with an unregistered email",
            "1. Open the Forgot Password page. 2. Enter an email address that is not registered. 3. Submit the request.",
            "The application displays a safe response without exposing whether an account exists.",
            "High",
            "Security"
        )

        add(
            "Verify invalid email format",
            "1. Open the Forgot Password page. 2. Enter an invalid email format. 3. Submit the request.",
            "The application displays an appropriate validation message and does not process the request.",
            "High",
            "Validation"
        )

        add(
            "Verify empty email validation",
            "1. Open the Forgot Password page. 2. Leave the email field empty. 3. Submit the request.",
            "The application prevents submission and indicates that the email field is required.",
            "Medium",
            "Validation"
        )

        add(
            "Verify expired password reset link",
            "1. Request a password reset link. 2. Wait until the link expires. 3. Open the expired link.",
            "The application rejects the expired link and provides an option to request a new one.",
            "High",
            "Security"
        )

        add(
            "Verify reuse of an already-used reset link",
            "1. Successfully reset the password using a reset link. 2. Open the same link again. 3. Attempt another password reset.",
            "The application rejects the previously used reset link.",
            "High",
            "Security"
        )

        add(
            "Verify password policy validation",
            "1. Open a valid password reset link. 2. Enter a password that does not meet the password policy. 3. Submit.",
            "The application rejects the password and displays the applicable password requirements.",
            "High",
            "Validation"
        )

        add(
            "Verify password confirmation mismatch",
            "1. Open a valid password reset link. 2. Enter different values in the new password and confirmation fields. 3. Submit.",
            "The application prevents the password update and displays a mismatch validation message.",
            "Medium",
            "Validation"
        )

        add(
            "Verify old password after successful reset",
            "1. Reset the password successfully. 2. Attempt to sign in using the old password.",
            "The old password is rejected.",
            "High",
            "Authentication"
        )

        add(
            "Verify login using the new password",
            "1. Reset the password successfully. 2. Open the sign-in page. 3. Enter the registered email and new password.",
            "The user can successfully sign in using the new password.",
            "Critical",
            "Authentication"
        )

    else:
        add(
            "Verify the primary successful flow",
            f"1. Open the relevant feature. 2. Provide valid data matching: {text[:180]} 3. Submit.",
            "The system completes the requested action and displays the expected success state.",
            "High"
        )

        add(
            "Verify required-field validation",
            "1. Open the feature. 2. Leave one or more required fields empty. 3. Submit.",
            "The system prevents submission and identifies the required fields.",
            "Medium",
            "Validation"
        )

        add(
            "Verify invalid input handling",
            "1. Open the feature. 2. Enter malformed or unsupported input. 3. Submit.",
            "The system displays a clear validation message and does not save invalid data.",
            "High",
            "Validation"
        )

        add(
            "Verify boundary conditions",
            "1. Identify minimum and maximum accepted values. 2. Test values at and just outside each boundary.",
            "Boundary values are handled correctly without crashes or data corruption.",
            "Medium",
            "Functional"
        )

        add(
            "Verify repeated submission",
            "1. Submit valid data. 2. Quickly submit again or refresh and repeat.",
            "The system avoids unintended duplicate operations.",
            "Medium",
            "Functional"
        )

    if any(k in lower for k in ["login", "sign in", "authentication"]):
        add(
            "Verify authentication with invalid credentials",
            "1. Open sign-in. 2. Enter an invalid email or password. 3. Submit.",
            "Access is denied and a safe, useful error is displayed.",
            "High",
            "Authentication"
        )

    if any(k in lower for k in ["payment", "checkout", "order", "purchase"]):
        add(
            "Verify payment failure recovery",
            "1. Start checkout. 2. Simulate a declined or interrupted payment.",
            "The order is not incorrectly marked paid and the user can retry safely.",
            "Critical",
            "Integration"
        )

    if any(k in lower for k in ["search", "filter", "sort"]):
        add(
            "Verify search and filtering combinations",
            "1. Enter a query. 2. Apply available filters and sorting. 3. Clear filters.",
            "Results match the query and selected filters, and clearing restores the full result set.",
            "Medium",
            "Functional"
        )

    return cases


def risk_score(severity: str, confidence: float, status: str):
    impact = {
        "Critical": 10,
        "High": 7,
        "Medium": 4,
        "Low": 1
    }.get(severity, 3)

    urgency = 1.0 if status == "Open" else 0.5

    return round(
        impact * (0.6 + 0.4 * max(0.0, min(confidence, 1.0))) * urgency,
        2
    )


def prioritise_cases(cases):
    weights = {
        "Critical": 4,
        "High": 3,
        "Medium": 2,
        "Low": 1
    }

    return sorted(
        cases,
        key=lambda item: weights.get(item["priority"], 2),
        reverse=True
    )

def test_register_login_and_access_protected_route(client):
    register_resp = client.post(
        "/auth/register", json={"email": "demo@example.com", "password": "hunter22"}
    )
    assert register_resp.status_code == 200
    assert register_resp.json()["email"] == "demo@example.com"

    login_resp = client.post(
        "/auth/login", json={"email": "demo@example.com", "password": "hunter22"}
    )
    assert login_resp.status_code == 200
    assert "session_token" in login_resp.cookies

    me_resp = client.get("/auth/me")
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "demo@example.com"


def test_wrong_password_is_rejected(client):
    client.post("/auth/register", json={"email": "demo2@example.com", "password": "hunter22"})
    resp = client.post("/auth/login", json={"email": "demo2@example.com", "password": "wrong"})
    assert resp.status_code == 401


def test_protected_route_requires_auth(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_duplicate_email_is_rejected(client):
    client.post("/auth/register", json={"email": "dup@example.com", "password": "hunter22"})
    resp = client.post("/auth/register", json={"email": "dup@example.com", "password": "hunter22"})
    assert resp.status_code == 400

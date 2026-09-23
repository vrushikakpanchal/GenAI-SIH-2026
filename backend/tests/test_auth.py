import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_login_success_ishita():
    response = client.post(
        "/api/auth/login",
        json={"email": "ishita@sentinel.local", "password": "Operator123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "ishita@sentinel.local"
    assert data["user"]["role"] == "operator"

def test_login_invalid_password():
    response = client.post(
        "/api/auth/login",
        json={"email": "ishita@sentinel.local", "password": "WrongPassword!"}
    )
    assert response.status_code == 401

def test_get_me_authenticated():
    login_resp = client.post(
        "/api/auth/login",
        json={"email": "rahul@sentinel.local", "password": "Reviewer123!"}
    )
    token = login_resp.json()["access_token"]
    
    me_resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_resp.status_code == 200
    user = me_resp.json()
    assert user["name"] == "Rahul Sharma"
    assert user["role"] == "reviewer"

def test_admin_rbac_permission():
    # Ishita (operator) should not be allowed to create a team
    login_ishita = client.post(
        "/api/auth/login",
        json={"email": "ishita@sentinel.local", "password": "Operator123!"}
    )
    token_ishita = login_ishita.json()["access_token"]
    forbidden_resp = client.post(
        "/api/teams",
        headers={"Authorization": f"Bearer {token_ishita}"},
        json={"name": "Unauthorized Team"}
    )
    assert forbidden_resp.status_code == 403

    # Admin should be allowed
    login_admin = client.post(
        "/api/auth/login",
        json={"email": "admin@sentinel.local", "password": "Admin123!"}
    )
    token_admin = login_admin.json()["access_token"]
    ok_resp = client.post(
        "/api/teams",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={"name": "Special Operations Unit"}
    )
    assert ok_resp.status_code == 200
    assert ok_resp.json()["name"] == "Special Operations Unit"

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_root_endpoint():
    """
    Verifies public greetings from the root endpoint.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

@pytest.mark.asyncio
async def test_auth_signup_validation():
    """
    Verifies that signups with missing parameters return validation error codes.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Pass missing password parameter to trigger schema rejection
        response = await ac.post(
            "/api/v1/auth/signup",
            json={
                "email": "invalid_user@voiceflow.ai",
                "full_name": "Invalid Tester"
            }
        )
    assert response.status_code == 422  # Pydantic validation error code

@pytest.mark.asyncio
async def test_get_agent_requires_auth():
    """
    Verifies that calling secure routers (like agents fetch) returns HTTP 401.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/agents/")
    assert response.status_code == 401

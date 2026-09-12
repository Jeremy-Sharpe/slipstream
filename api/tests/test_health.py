from fastapi.testclient import TestClient


def test_health_runs_without_credentials(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["storage"] == "memory"
    assert response.json()["integrations"] == {
        "supabase": False,
        "anthropic": False,
        "elevenlabs": False,
        "origami": False,
    }


def test_versioned_health_route(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["service"] == "Slipstream API"


def test_cors_allows_configured_web_origin(client: TestClient) -> None:
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"

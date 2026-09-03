def test_api_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_frontend_index_serving(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "SmartHire AI" in response.text


def test_frontend_assets_serving(client):
    logo_resp = client.get("/assets/logo.svg")
    assert logo_resp.status_code == 200
    assert "svg" in logo_resp.headers.get("content-type", "").lower() or "<svg" in logo_resp.text

    css_resp = client.get("/css/styles.css")
    assert css_resp.status_code == 200

    js_resp = client.get("/js/app.js")
    assert js_resp.status_code == 200


def test_security_env_not_exposed(client):
    """Ensure sensitive environment and server files are NOT statically exposed."""
    env_resp = client.get("/.env")
    assert env_resp.status_code == 404

    db_resp = client.get("/data/smarthire.db")
    assert db_resp.status_code == 404

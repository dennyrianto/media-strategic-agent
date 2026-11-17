"""Contract tests: the React UI depends on these exact URLs and camelCase shapes."""
from app.gemini import GeminiError

BRIEF = {"brandName": "Acme", "industry": "Retail", "product": "Shoes", "targetAudience": "Gen Z",
         "objectives": "Awareness", "budget": "$1M", "timeline": "Q1", "imageUrl": "ignored-extra"}


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_analyze_brief_shape(client):
    r = client.post("/api/gemini/analyze-brief", json={"text": "brief text"})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"summary", "structured", "suggestions"}
    assert body["summary"].startswith("# Acme")
    assert body["structured"]["brandName"] == "Acme"
    assert set(body["structured"]) == {"brandName", "industry", "product", "targetAudience",
                                       "objectives", "budget", "timeline"}
    assert body["suggestions"] == ["Q1?", "Q2?"]


def test_analyze_brief_sends_file_then_text_then_prompt(client, fake):
    import base64
    client.post("/api/gemini/analyze-brief", json={
        "text": "hello", "fileBase64": base64.b64encode(b"%PDF").decode(), "mimeType": "application/pdf"})
    contents = fake.calls[0][1]
    assert len(contents) == 3
    assert contents[0].inline_data.mime_type == "application/pdf"
    assert contents[1].text == "hello"


def test_market_dashboard_camelcase(client):
    body = client.post("/api/gemini/market-dashboard", json={"rawIntel": "x"}).json()
    assert body["sentiment"] == 72
    for key in ("keyInsights", "channelMix", "audienceSegments", "geoFocus", "benchmarking", "swot", "trends"):
        assert key in body
    assert body["benchmarking"][0]["marketShare"] == ""


def test_step_content_grounded_only_for_market_intel(client, fake):
    r = client.post("/api/gemini/step-content", json={"step": 2, "brief": BRIEF})
    assert r.json() == {"text": "# Market Intelligence Report"}
    assert fake.calls[-1][2] is True
    client.post("/api/gemini/step-content", json={"step": 4, "brief": BRIEF})
    assert fake.calls[-1][2] is False


def test_step_content_uses_summary_and_truncates_previous(client, fake):
    prev = {"2": {"rawText": "M" * 2000}, "3": {"rawText": "P" * 2000}}
    client.post("/api/gemini/step-content", json={
        "step": 4, "brief": {**BRIEF, "summary": "VALIDATED SUMMARY"}, "previousResults": prev})
    prompt = fake.calls[-1][1]
    assert "Validated Brief Summary:\nVALIDATED SUMMARY" in prompt
    assert "M" * 800 in prompt and "M" * 801 not in prompt
    assert "Target Personas: " + "P" * 800 in prompt


def test_personas_ids_images_and_failure_isolation(client, fake):
    fake.image_fail = {"Persona-X"}  # no match -> all succeed first
    r = client.post("/api/gemini/personas", json={"brief": BRIEF, "marketIntelligence": "intel"})
    assert r.status_code == 200
    body = r.json()
    ps = body["personas"]
    assert [p["id"] for p in ps] == ["persona-0", "persona-1", "persona-2"]
    assert ps[0]["imageUrl"].startswith("data:image/png")
    assert "imageUrl" not in ps[2]  # no visualDescription -> no portrait, key omitted
    assert ps[0]["microSegmentation"] == "Seg" and ps[0]["digitalJourney"] == ["TikTok"]
    assert body["text"].lstrip().startswith("# Audience Personas")
    assert "## Persona 0" in body["text"]


def test_personas_image_failure_does_not_fail_step(client, fake):
    fake.image_fail = {"Context: Acme"}  # every portrait prompt contains this
    r = client.post("/api/gemini/personas", json={"brief": BRIEF})
    assert r.status_code == 200
    assert all("imageUrl" not in p for p in r.json()["personas"])


def test_personas_upload_handling(client, fake):
    import base64
    b64 = lambda b: base64.b64encode(b).decode()
    client.post("/api/gemini/personas", json={
        "brief": BRIEF, "refinementQuery": "Focus on Jakarta",
        "additionalFiles": [
            {"name": "d.csv", "mimeType": "text/csv", "base64": b64(b"a,b\n1,2")},
            {"name": "big.txt", "mimeType": "text/plain", "base64": b64(b"z" * 30000)},
            {"name": "p.png", "mimeType": "image/png", "base64": b64(b"\x89PNG")},
            {"name": "x.bin", "mimeType": "application/octet-stream", "base64": b64(b"??")},
            {"name": "bad.txt", "mimeType": "text/plain", "base64": "!!notbase64!!"},
        ]})
    contents = fake.calls[0][1]
    texts = [getattr(c, "text", None) for c in contents]
    assert "[Uploaded Data: d.csv]\na,b\n1,2" in texts
    assert any(t and "...[Data Truncated for Analysis]..." in t for t in texts)
    assert any(c.inline_data and c.inline_data.mime_type == "image/png" for c in contents)
    assert not any(t and "x.bin" in t for t in texts)  # unsupported type ignored
    assert any(t and "CRITICAL REFINEMENT INSTRUCTION**: Focus on Jakarta" in t for t in texts)


def test_moments(client):
    body = client.post("/api/gemini/moments", json={"brief": BRIEF, "personaSummary": "s"}).json()
    assert body["moments"][0]["relevanceScore"] == 10
    assert body["moments"][0]["activationIdea"] == "idea 0"
    assert "## Moment 0 (Jan 1)" in body["text"] and "**Relevance**: 10/100" in body["text"]


def test_big_ideas_prompt_uses_top_moments_by_score(client, fake):
    moments = [
        {"title": f"M{i}", "month": "May", "date": "May 1", "type": "Trend", "relevanceScore": i * 10,
         "description": "d", "activationIdea": f"act{i}", "contentFocus": "c", "brandingIdea": "b"}
        for i in range(8)
    ]
    personas = [{"id": "p", "name": "Ann", "role": "Dev", "age": "30", "quote": "q", "microSegmentation": "m",
                 "psychographics": [], "digitalJourney": [], "drivers": ["Speed"], "brandAffinity": [],
                 "painPoints": ["Cost"], "imageUrl": "data:image/png;base64,AAA"}]
    body = client.post("/api/gemini/big-ideas", json={"brief": BRIEF, "personas": personas, "moments": moments}).json()
    prompt = fake.calls[0][1]
    assert "M7 (act7); M6 (act6); M5 (act5); M4 (act4); M3 (act3)" in prompt
    assert "M2" not in prompt
    assert "Name: Ann, Role: Dev, Motivation: Speed, Pain Point: Cost" in prompt
    idea = body["ideas"][0]
    assert idea["culturalFit"] == "Fit" and idea["funnelStrategy"][0]["touchpoints"] == ["TV", "OOH"]
    assert "**Acronym**: GO - Great Offer" in body["text"]


def test_media_strategy(client):
    body = client.post("/api/gemini/media-strategy", json={"brief": BRIEF}).json()
    s = body["strategy"]
    assert set(s) == {"personaStrategies", "budgetAllocation", "tacticalBlueprint", "localNuances", "flightPlan"}
    assert s["flightPlan"]["channels"][0]["activities"][0]["phaseName"] == "Tease"
    assert s["tacticalBlueprint"][0]["targeting"]["affinities"] == ["Sports"]
    t = body["text"]
    assert "- **TV (40%)**: Reach" in t
    assert "**Awareness** (Reach)\n- **Digital**: S" in t
    assert "- Rain: Weather -> rla" in t


# ---- error contract: UI reads `error`, never `detail` ---------------------
def test_gemini_error_shape(client, fake):
    fake.raise_error = GeminiError("model exploded", 502)
    r = client.post("/api/gemini/moments", json={"brief": BRIEF})
    assert r.status_code == 502 and r.json() == {"error": "model exploded"}


def test_validation_error_shape(client):
    r = client.post("/api/gemini/step-content", json={"brief": BRIEF})  # missing step
    assert r.status_code == 422
    assert r.json()["error"].startswith("Invalid request (step)")


def test_rate_limit(make_client):
    c = make_client(rate_limit_per_minute=2)
    assert c.get("/api/health").status_code == 200
    assert c.get("/api/health").status_code == 200
    r = c.get("/api/health")
    assert r.status_code == 429 and "error" in r.json()


def test_body_limit(make_client):
    c = make_client(max_body_bytes=100)
    r = c.post("/api/gemini/market-dashboard", json={"rawIntel": "x" * 500})
    assert r.status_code == 413 and r.json() == {"error": "Request body too large."}

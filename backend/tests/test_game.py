from uuid import uuid4

from fastapi.testclient import TestClient


def auth_headers(client: TestClient, username: str = "gameuser") -> dict[str, str]:
    client.post("/users/register", json={"username": username, "password": "testpass123"})
    response = client.post(
        "/users/login",
        data={"username": username, "password": "testpass123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def stage_answer(
    client: TestClient,
    headers: dict[str, str],
    *,
    correct: bool,
    answer_id: str | None = None,
    type_name: str = "fire",
) -> object:
    return client.post(
        "/game/stage/answer",
        headers=headers,
        json={
            "region": "kanto",
            "type_name": type_name,
            "is_correct": correct,
            "answer_id": answer_id or str(uuid4()),
        },
    )


def test_game_routes_require_authentication(client: TestClient):
    progress = client.get("/game/regions/progress")
    answer = stage_answer(client, {}, correct=True)
    result = client.post("/game/save-result", json={"correct": True, "score": 1})

    assert progress.status_code == 401
    assert answer.status_code == 401
    assert result.status_code == 401


def test_regions_progress_has_all_stages(client: TestClient):
    response = client.get("/game/regions/progress", headers=auth_headers(client))

    assert response.status_code == 200
    regions = response.json()
    assert len(regions) == 9
    assert sum(len(region["stages"]) for region in regions) == 54
    assert all(not region["badge_earned"] for region in regions)


def test_stage_passes_after_seven_correct_answers(client: TestClient):
    headers = auth_headers(client)

    responses = [stage_answer(client, headers, correct=index < 7) for index in range(10)]

    assert all(response.status_code == 200 for response in responses)
    result = responses[-1].json()
    assert result["attempt_finished"] is True
    assert result["attempt_passed"] is True
    assert result["attempt_correct_count"] == 7
    assert result["stage_progress"]["completed"] is True
    assert result["stage_progress"]["attempts"] == 1
    assert result["stage_progress"]["correct_count"] == 0
    assert result["stage_progress"]["total_count"] == 0


def test_stage_answer_is_idempotent(client: TestClient):
    headers = auth_headers(client)
    answer_id = str(uuid4())

    first = stage_answer(client, headers, correct=True, answer_id=answer_id)
    duplicate = stage_answer(client, headers, correct=True, answer_id=answer_id)
    progress = client.get("/game/regions/progress", headers=headers)

    assert first.status_code == 200
    assert duplicate.status_code == 200
    assert duplicate.json() == first.json()
    fire_stage = progress.json()[0]["stages"][0]
    assert fire_stage["total_count"] == 1
    assert fire_stage["correct_count"] == 1


def test_stage_failure_resets_attempt_without_completion(client: TestClient):
    headers = auth_headers(client)
    responses = [stage_answer(client, headers, correct=index < 6) for index in range(10)]

    result = responses[-1].json()
    assert result["attempt_finished"] is True
    assert result["attempt_passed"] is False
    assert result["attempt_correct_count"] == 6
    assert result["stage_progress"]["completed"] is False
    assert result["stage_progress"]["attempts"] == 1


def test_completing_all_region_stages_awards_badge_once(client: TestClient):
    headers = auth_headers(client)
    kanto_types = ["fire", "water", "grass", "psychic", "ghost", "dragon"]
    last_response = None

    for type_name in kanto_types:
        for _ in range(10):
            last_response = stage_answer(
                client,
                headers,
                correct=True,
                type_name=type_name,
            )

    assert last_response is not None
    assert last_response.status_code == 200
    result = last_response.json()
    assert result["region_completed"] is True
    assert result["new_achievements"] == ["Campeón de Kanto"]

    for _ in range(10):
        stage_answer(client, headers, correct=True, type_name="dragon")

    profile = client.get("/users/profile?username=gameuser").json()
    badge_names = [item["name"] for item in profile["achievements"]]
    assert badge_names.count("Campeón de Kanto") == 1


def test_invalid_stage_is_rejected(client: TestClient):
    headers = auth_headers(client)
    response = client.post(
        "/game/stage/answer",
        headers=headers,
        json={
            "region": "kanto",
            "type_name": "electric",
            "is_correct": True,
            "answer_id": str(uuid4()),
        },
    )

    assert response.status_code == 400


def test_free_game_result_updates_authenticated_user(client: TestClient):
    headers = auth_headers(client)
    response = client.post(
        "/game/save-result",
        headers=headers,
        json={"correct": True, "score": 3},
    )
    profile = client.get("/users/profile?username=gameuser")

    assert response.status_code == 200
    assert profile.status_code == 200
    assert profile.json()["stats"]["total_answers"] == 1
    assert profile.json()["stats"]["correct_answers"] == 1
    assert profile.json()["stats"]["high_score"] == 3


def test_ranking_is_public_and_requires_a_completed_adventure_attempt(client: TestClient):
    headers = auth_headers(client, "ranked-user")

    for index in range(9):
        stage_answer(client, headers, correct=index < 7)

    before_completion = client.get("/game/ranking")
    assert before_completion.status_code == 200
    assert before_completion.json() == {
        "leaders": [],
        "current_user": None,
        "total_players": 0,
    }

    stage_answer(client, headers, correct=False)
    ranking = client.get("/game/ranking")

    assert ranking.status_code == 200
    assert ranking.json()["total_players"] == 1
    assert ranking.json()["current_user"] is None
    assert ranking.json()["leaders"][0] == {
        "position": 1,
        "username": "ranked-user",
        "avatar_url": None,
        "points": 7,
        "medals": 0,
        "accuracy": 70.0,
        "attempts": 1,
    }


def test_ranking_returns_personal_position_and_does_not_duplicate_answers(client: TestClient):
    first_headers = auth_headers(client, "ash")
    second_headers = auth_headers(client, "misty")

    for index in range(10):
        stage_answer(client, first_headers, correct=index < 8)

    duplicate_id = str(uuid4())
    stage_answer(client, second_headers, correct=True, answer_id=duplicate_id)
    stage_answer(client, second_headers, correct=True, answer_id=duplicate_id)
    for index in range(9):
        stage_answer(client, second_headers, correct=index < 6)

    ranking = client.get("/game/ranking", headers=second_headers).json()

    assert [entry["username"] for entry in ranking["leaders"]] == ["ash", "misty"]
    assert [entry["points"] for entry in ranking["leaders"]] == [8, 7]
    assert ranking["current_user"]["username"] == "misty"
    assert ranking["current_user"]["position"] == 2
    assert ranking["current_user"]["attempts"] == 1

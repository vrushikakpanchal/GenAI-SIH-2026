import json
import requests


COLAB_API_URL = "https://disbelief-class-spotless.ngrok-free.dev/generate"


def generate_video_blueprint(
    text,
    target_audience,
    tone,
    language,
    duration,
    objective,
    style
):
    """
    Sends the source document to the Qwen3-4B
    inference API running on Google Colab.
    """

    # Keep the source text within a reasonable size
    text = text[:12000]

    data = {
        "text": text,
        "target_audience": target_audience,
        "tone": tone,
        "language": language,
        "duration": duration,
        "objective": objective,
        "style": style
    }

    try:
        response = requests.post(
            COLAB_API_URL,
            json=data,
            timeout=600
        )

    except requests.exceptions.RequestException as e:
        raise RuntimeError(
            f"Could not connect to the Qwen API: {e}"
        )

    if response.status_code != 200:
        try:
            error_message = response.json().get(
                "error",
                "Unknown API error"
            )
        except Exception:
            error_message = response.text

        raise RuntimeError(
            f"Qwen API returned HTTP {response.status_code}: "
            f"{error_message}"
        )

    try:
        result = response.json()
    except json.JSONDecodeError:
        raise RuntimeError(
            "The Qwen API returned an invalid JSON response."
        )

    return result
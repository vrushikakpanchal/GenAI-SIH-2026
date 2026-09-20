import ollama
import json


def generate_video_blueprint(
    text,
    target_audience,
    tone,
    language,
    duration,
    objective,
    style
):

    # Limit source text to avoid overwhelming the local model
    text = text[:12000]

    prompt = f"""
You are an AI video content transformation system.

Transform the source document into a professional video blueprint.

IMPORTANT:
- Do NOT copy the document sentence-by-sentence.
- Understand the main ideas and create a logical story.
- Remove page numbers, headers, footers and document noise.
- Do not invent facts that are not supported by the source.
- Adapt the content to the selected audience, tone and objective.
- Write natural narration.
- Do not include labels such as "[Professional tone]" in the narration.
- Return ONLY valid JSON.
- Do not use Markdown.
- Do not add explanations outside the JSON.

INPUT SETTINGS:

Target audience: {target_audience}
Tone: {tone}
Language: {language}
Duration: {duration} seconds
Objective: {objective}
Visual style: {style}

Create approximately {max(3, min(8, duration // 10))} scenes.

Each scene must contain:

scene_number
duration_seconds
visual_description
on_screen_text
narration
audio_cue
visual_recommendation

Also return:

title
target_audience
tone
language
duration_seconds
objective
style
scenes
full_narration
subtitles

SOURCE DOCUMENT:

{text}
"""

    response = ollama.chat(
        model="qwen3:4b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    result_text = response["message"]["content"].strip()

    # Remove accidental Markdown code fences
    if result_text.startswith("```"):
        result_text = result_text.replace("```json", "")
        result_text = result_text.replace("```", "")
        result_text = result_text.strip()

    try:
        result = json.loads(result_text)

    except json.JSONDecodeError:

        raise ValueError(
            "The AI returned an invalid JSON response. "
            "Please try again."
        )

    return result
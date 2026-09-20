from flask import Flask, render_template, request
from parser import extract_text
from generator import generate_video_blueprint
import os

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route("/", methods=["GET", "POST"])
def index():

    result = None
    error = None

    if request.method == "POST":

        file = request.files.get("document")

        # Get user-selected parameters
        target_audience = request.form.get(
            "target_audience", "General Audience"
        )

        tone = request.form.get(
            "tone", "Professional"
        )

        language = request.form.get(
            "language", "English"
        )

        duration = request.form.get(
            "duration", "60"
        )

        objective = request.form.get(
            "objective", "Inform"
        )

        style = request.form.get(
            "style", "Educational"
        )

        if not file or file.filename == "":
            error = "Please upload a document."

            return render_template(
                "index.html",
                result=result,
                error=error
            )

        filepath = os.path.join(
            app.config["UPLOAD_FOLDER"],
            file.filename
        )

        file.save(filepath)

        try:

            text = extract_text(filepath)

            if not text.strip():
                raise ValueError(
                    "No readable text found in the document."
                )

            result = generate_video_blueprint(
                text=text,
                target_audience=target_audience,
                tone=tone,
                language=language,
                duration=int(duration),
                objective=objective,
                style=style
            )

        except Exception as e:

            error = str(e)

    return render_template(
        "index.html",
        result=result,
        error=error
    )


if __name__ == "__main__":
    app.run(debug=True)
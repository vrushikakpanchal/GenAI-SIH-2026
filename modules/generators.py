import os
import json
import ollama
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from typing import Dict, Any

# Ensure output directory exists
OUTPUT_DIR = os.path.join("data", "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ---------------------------------------------------------
# 1. Executive Brief & PDF Advisory Generator
# ---------------------------------------------------------
def generate_pdf_advisory(canonical_facts: Dict[str, Any]) -> str:
    """
    Generates an HTML report and attempts to render it to PDF using WeasyPrint.
    If WeasyPrint GTK runtime is missing on Windows, falls back to saving an HTML/Markdown report.
    """
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; color: #222; }}
            .header {{ border-bottom: 3px solid #1a365d; padding-bottom: 10px; margin-bottom: 20px; }}
            .title {{ color: #1a365d; font-size: 24px; font-weight: bold; }}
            .badge {{ display: inline-block; padding: 4px 12px; font-weight: bold; color: white; background-color: #e53e3e; border-radius: 4px; }}
            .section {{ margin-top: 20px; }}
            .section-title {{ font-size: 16px; font-weight: bold; color: #2b6cb0; border-bottom: 1px solid #cbd5e0; padding-bottom: 4px; }}
            ul {{ line-height: 1.6; }}
            .code-box {{ background: #f7fafc; border: 1px solid #e2e8f0; padding: 10px; font-family: monospace; border-radius: 4px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">{canonical_facts.get('title', 'CYBERSECURITY ADVISORY')}</div>
            <p><strong>Severity:</strong> <span class="badge">{canonical_facts.get('severity', 'UNKNOWN')}</span></p>
        </div>
        
        <div class="section">
            <div class="section-title">Executive Summary</div>
            <p>{canonical_facts.get('summary', 'No summary available.')}</p>
        </div>

        <div class="section">
            <div class="section-title">Identified Vulnerabilities & Technical Indicators</div>
            <p><strong>Associated CVEs:</strong> {', '.join(canonical_facts.get('cve_ids', []))}</p>
            <p><strong>Affected Systems:</strong> {', '.join(canonical_facts.get('affected_systems', []))}</p>
            <p><strong>Locked IP Addresses:</strong></p>
            <div class="code-box">{', '.join(canonical_facts.get('locked_ips', []))}</div>
        </div>

        <div class="section">
            <div class="section-title">Recommended Mitigations</div>
            <ul>
                {''.join([f'<li>{action}</li>' for action in canonical_facts.get('recommended_actions', [])])}
            </ul>
        </div>
    </body>
    </html>
    """
    
    pdf_path = os.path.join(OUTPUT_DIR, "advisory_report.pdf")
    html_path = os.path.join(OUTPUT_DIR, "advisory_report.html")
    
    # Save HTML version
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    # Render PDF via WeasyPrint
    try:
        from weasyprint import HTML
        HTML(string=html_content).write_pdf(pdf_path)
        return pdf_path
    except Exception as e:
        print(f"[!] WeasyPrint warning ({e}). HTML report saved to {html_path}")
        return html_path


# ---------------------------------------------------------
# 2. Social Media Generator (LinkedIn & Twitter/X)
# ---------------------------------------------------------
def generate_social_content(canonical_facts: Dict[str, Any], model_name: str = "qwen2.5:3b") -> Dict[str, Any]:
    prompt = f"""
    Transform the following security facts into two distinct social media posts:
    1. LinkedIn Post: Professional, urgent alert format with bullet points, threat overview, action items, and relevant hashtags.
    2. Twitter/X Thread: Exactly 3 numbered tweets. Keep each tweet strictly under 280 characters.
    
    Facts: {json.dumps(canonical_facts)}
    
    Return a strictly valid JSON object with keys: "linkedin_post" and "twitter_thread" (a list of 3 strings).
    Do NOT include markdown formatting or extra text outside the JSON object.
    """
    
    response = ollama.chat(
        model=model_name,
        messages=[{'role': 'user', 'content': prompt}],
        format='json'
    )
    
    social_data = json.loads(response['message']['content'])
    output_path = os.path.join(OUTPUT_DIR, "social_posts.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(social_data, f, indent=2)
        
    return social_data


# ---------------------------------------------------------
# 3. PowerPoint Slide Deck Generator (.pptx)
# ---------------------------------------------------------
def generate_presentation(canonical_facts: Dict[str, Any]) -> str:
    prs = Presentation()
    
    # Slide 1: Title Slide
    blank_slide_layout = prs.slide_layouts[0]
    slide1 = prs.slides.add_slide(blank_slide_layout)
    slide1.shapes.title.text = canonical_facts.get("title", "Threat Briefing")
    slide1.placeholders[1].text = f"Severity: {canonical_facts.get('severity', 'HIGH')}\nNTRO Cybersecurity Automated Briefing"
    
    # Slide 2: Threat Summary
    bullet_slide_layout = prs.slide_layouts[1]
    slide2 = prs.slides.add_slide(bullet_slide_layout)
    slide2.shapes.title.text = "Executive Threat Overview"
    tf2 = slide2.placeholders[1].text_frame
    tf2.text = canonical_facts.get("summary", "")
    p2 = tf2.add_paragraph()
    p2.text = f"Affected Systems: {', '.join(canonical_facts.get('affected_systems', []))}"
    
    # Slide 3: Vulnerabilities & IPs
    slide3 = prs.slides.add_slide(bullet_slide_layout)
    slide3.shapes.title.text = "Technical Indicators & CVEs"
    tf3 = slide3.placeholders[1].text_frame
    tf3.text = f"Identified CVEs: {', '.join(canonical_facts.get('cve_ids', []))}"
    p3 = tf3.add_paragraph()
    p3.text = f"Flagged IP Addresses: {', '.join(canonical_facts.get('locked_ips', []))}"
    
    # Slide 4: Recommendations
    slide4 = prs.slides.add_slide(bullet_slide_layout)
    slide4.shapes.title.text = "Mitigation & Next Steps"
    tf4 = slide4.placeholders[1].text_frame
    for action in canonical_facts.get("recommended_actions", []):
        p = tf4.add_paragraph()
        p.text = f"• {action}"

    pptx_path = os.path.join(OUTPUT_DIR, "presentation.pptx")
    prs.save(pptx_path)
    return pptx_path


# ---------------------------------------------------------
# 4. Video Package Generator (Script + Storyboard)
# ---------------------------------------------------------
def generate_video_package(canonical_facts: Dict[str, Any], model_name: str = "qwen2.5:3b") -> Dict[str, Any]:
    prompt = f"""
    Create a 30-second cybersecurity alert video script and visual storyboard based on these facts:
    {json.dumps(canonical_facts)}
    
    Return a JSON object with keys:
    - "video_title": str
    - "scenes": list of objects containing ("scene_number", "visual_description", "narration_text", "on_screen_text")
    """
    
    response = ollama.chat(
        model=model_name,
        messages=[{'role': 'user', 'content': prompt}],
        format='json'
    )
    
    video_data = json.loads(response['message']['content'])
    output_path = os.path.join(OUTPUT_DIR, "video_package.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(video_data, f, indent=2)
        
    return video_data


# ---------------------------------------------------------
# 5. Infographic Blueprint Generator (.svg)
# ---------------------------------------------------------
def generate_infographic_svg(canonical_facts: Dict[str, Any]) -> str:
    severity = canonical_facts.get('severity', 'CRITICAL')
    cves = ', '.join(canonical_facts.get('cve_ids', []))
    ips = ', '.join(canonical_facts.get('locked_ips', []))
    actions = canonical_facts.get('recommended_actions', ['Apply patches immediately'])
    
    action_items_xml = ""
    for idx, act in enumerate(actions[:3]):
        action_items_xml += f'<text x="40" y="{260 + idx * 30}" font-family="Arial" font-size="14" fill="#2D3748">• {act[:65]}</text>\n'

    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%">
        <!-- Background -->
        <rect width="800" height="400" fill="#F7FAFC" rx="10"/>
        
        <!-- Header Banner -->
        <rect width="800" height="70" fill="#1A365D" rx="10"/>
        <text x="30" y="45" font-family="Arial" font-size="22" font-weight="bold" fill="#FFFFFF">{canonical_facts.get('title', 'SECURITY ALERT')[:50]}</text>
        
        <!-- Severity Card -->
        <rect x="30" y="90" width="220" height="100" fill="#FFF5F5" stroke="#E53E3E" stroke-width="2" rx="8"/>
        <text x="45" y="120" font-family="Arial" font-size="14" fill="#C53030" font-weight="bold">SEVERITY RATING</text>
        <text x="45" y="160" font-family="Arial" font-size="28" fill="#E53E3E" font-weight="bold">{severity}</text>
        
        <!-- CVE Card -->
        <rect x="270" y="90" width="240" height="100" fill="#EBF8FF" stroke="#3182CE" stroke-width="2" rx="8"/>
        <text x="285" y="120" font-family="Arial" font-size="14" fill="#2B6CB0" font-weight="bold">IDENTIFIED CVEs</text>
        <text x="285" y="155" font-family="Arial" font-size="16" fill="#2D3748">{cves}</text>

        <!-- IP Card -->
        <rect x="530" y="90" width="240" height="100" fill="#EDF2F7" stroke="#4A5568" stroke-width="2" rx="8"/>
        <text x="545" y="120" font-family="Arial" font-size="14" fill="#2D3748" font-weight="bold">LOCKED IPs</text>
        <text x="545" y="155" font-family="Arial" font-size="16" fill="#2D3748">{ips}</text>

        <!-- Mitigations Section -->
        <rect x="30" y="210" width="740" height="160" fill="#FFFFFF" stroke="#CBD5E0" stroke-width="1.5" rx="8"/>
        <text x="40" y="238" font-family="Arial" font-size="16" font-weight="bold" fill="#1A365D">RECOMMENDED MITIGATION STEPS</text>
        {action_items_xml}
    </svg>"""

    svg_path = os.path.join(OUTPUT_DIR, "infographic_blueprint.svg")
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)

    return svg_path
import os, openai, textwrap, json

openai.api_key = os.environ["OPENAI_API_KEY"]

SYSTEM = """
You are an expert academic document formatter and typesetter.
Given a set of text chunks (with possible metadata about font size, bold, italics, position, etc.) from a PDF, output a single, beautiful, academic-paper-style TSX/HTML document.

Strict rules:
- Only use these elements: <h1>, <h2>, <h3>, <p>, <blockquote>, <pre>, <code>, <ul>, <ol>, <li>, <figure>, <figcaption>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <sup>, <sub>, <hr>.
- Use <div className=\"author-block\"> for author blocks, and <div className=\"page-number\"> for page numbers. These should be visually consistent.
- Use italics, bold, and heading levels based on cues from the input (e.g., font size, bold/italic, position, etc.).
- Number sections and subsections if possible.
- Use only academic, professional formatting. No wild colors, no random font sizes, no non-academic elements.
- Use Tailwind classes for typography/layout if possible, but keep the structure clean and academic.
- Output only the TSX/HTML, no explanations.
- Wrap the entire output in a <div className=\"academic-paper\">.
- Do NOT add any container for page size, margins, or background—those are handled by the frontend.
- If you detect a page number, always output it as <div className=\"page-number\">Page N</div> at the bottom of the page content.
- If you detect an author block, always output it as <div className=\"author-block\">...</div> at the top, styled as a small, centered block.
- Use consistent spacing and indentation.
- Format tables and figures to match academic conventions.
- Format citations and footnotes in academic style.
- If you are unsure about a chunk, default to <p>.
"""

PROMPT = textwrap.dedent("""
Format the following PDF text chunks into a single, beautiful, academic-paper-style TSX/HTML document.

Guidelines:
• Use only the allowed elements and classes as described above.
• Use italics, bold, and heading levels based on cues from the input (e.g., font size, bold/italic, position, etc.).
• Number sections and subsections if possible.
• Use <div className=\"author-block\"> for author blocks, and <div className=\"page-number\"> for page numbers.
• Use Tailwind classes for typography/layout if possible, but keep the structure clean and academic.
• Output only the TSX/HTML, no explanations.
• Wrap the entire output in a <div className=\"academic-paper\">.
• Do NOT add any container for page size, margins, or background—those are handled by the frontend.

Input chunks (in order):
{}

Output TSX/HTML:
""")

def tsx_from_chunks(chunks:list[dict]) -> str:
    # Optionally, pass through font/position metadata if available in chunks
    # For now, just pass the content
    text_chunks = [chunk.get("content", "") for chunk in chunks if chunk.get("content")]
    combined_text = "\n".join(text_chunks)
    msg = PROMPT.format(combined_text)
    try:
        client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role":"system", "content": SYSTEM},
                      {"role": "user", "content": msg}],
            temperature=0.1,
            max_tokens=4096,
        )
        return resp.choices[0].message.content.strip()
    except AttributeError:
        resp = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[{"role":"system", "content": SYSTEM},
                      {"role": "user", "content": msg}],
            temperature=0.1,
            max_tokens=4096,
        )
        return resp.choices[0].message.content.strip()
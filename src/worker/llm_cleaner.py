import os, openai, textwrap, json

openai.api_key = os.environ["OPENAI_API_KEY"]

SYSTEM = """
You are an expert academic typesetter. Your task is to convert unstructured text chunks from a PDF into a single, clean, and semantically correct TSX/HTML document formatted to look like a professional academic paper.

**Formatting Rules (Strictly Follow):**
1.  **Root Element**: Wrap the entire output in a single `<div className="academic-paper">`. Do NOT add page-level containers, margins, or backgrounds; this is handled by the frontend.
2.  **Headings**:
    - Identify numbered section titles (e.g., "1.2 Supervised learning", "1.2.1 Uncertainty").
    - Format them as `<h2>` or `<h3>`. Place the number inside a `span` with the class `section-number`.
    - Example: `<h2><span className="section-number">1.2</span>Supervised learning</h2>`
3.  **Paragraphs**:
    - Use `<p>` for all body text.
    - The CSS will handle first-line indentation automatically. Do not add manual indentation.
4.  **Equations**:
    - For any centered or display-style mathematical equation, especially those with an equation number, you MUST use the following structure:
      `<div className="equation">
        <div className="equation-content">$$ ...your_latex_equation... $$</div>
        <span className="equation-number">(1.6)</span>
      </div>`
    - The LaTeX content must be wrapped in `$$...$$`.
5.  **Blockquotes**:
    - For indented quote blocks (like the Kant quote in the example), use a `<blockquote>` tag.
6.  **Page Numbers**:
    - Page numbers from the source document should NOT be included in the main body. The frontend will handle page numbering based on the data it receives.
7.  **Citations**:
    - Keep citations like `[Kon20]` or `(see Section 5.1)` inline with the text.
8.  **Allowed Elements**: Only use `div`, `h1`, `h2`, `h3`, `p`, `span`, `blockquote`, `$$...$$` for math. No other HTML tags are permitted unless absolutely necessary for tables or lists which should follow standard academic formatting.
9.  **Output**: Produce ONLY the raw TSX/HTML code. No explanations, no apologies, no markdown fences.
"""

PROMPT = textwrap.dedent("""
Format the following PDF text chunks into a single, beautiful, academic-paper-style TSX/HTML document, following all the rules provided in the system prompt.

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
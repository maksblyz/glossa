
import os, textwrap, google.generativeai as genai, json


genai.configure(api_key=os.environ["GEMINI_API_KEY"])
SYSTEM = """
You are an expert academic typesetter. Your only job is to convert raw text into a single, clean, and semantically correct TSX/HTML document formatted to look like a professional academic paper. You MUST follow all rules precisely.

**Formatting Rules:**
1.  **Root Element**: Wrap the ENTIRE output in `<div className="academic-paper">`.
2.  **Headings**: Identify numbered section titles (e.g., "1.2 Supervised learning"). Format them as `<h2>` or `<h3>`. Wrap the number in `<span className="section-number">`.
3.  **Paragraphs**: Use `<p>` for all body text. CSS will handle all indentation.
4.  **Equations**: For any equation with a number, you MUST use the following multi-line structure for clarity. This is not optional.
    <div className="equation">
      <div className="equation-content">$$ ...your_latex_equation... $$</div>
      <span className="equation-number">(1.6)</span>
    </div>
5.  **Blockquotes**: For indented quotes, use a `<blockquote>` tag.
6.  **Page Numbers**: Do NOT output the source document's page numbers.
7.  **Output**: You must produce ONLY the raw TSX/HTML code. No explanations, no markdown.
"""

PROMPT = textwrap.dedent("""
Format the following text chunks into a single TSX/HTML document. Follow the system prompt rules exactly.

**Example of Correct Formatting:**

*Input Text:*
1.2 Supervised learning
One way to define the problem...
θ = argmin L(θ) (1.6)
This is called empirical risk minimization.

*Correct TSX/HTML Output:*
<div className="academic-paper">
  <h2><span className="section-number">1.2</span> Supervised learning</h2>
  <p>One way to define the problem...</p>
  <div className="equation">
    <div className="equation-content">$$ \\theta = \\underset{{\\theta}}{{\\mathrm{{argmin}}}} \\, \\mathcal{{L}}(\\theta) $$</div>
    <span className="equation-number">(1.6)</span>
  </div>
  <p>This is called empirical risk minimization.</p>
</div>

---

**Now, format the following input chunks based on these rules:**

**Input chunks:**
{}

**Output TSX/HTML:**
""")

def tsx_from_chunks(chunks: list[dict]) -> str:
    text_chunks = [c.get("content", "") for c in chunks if c.get("content")]
    user_msg   = PROMPT.format("\n".join(text_chunks))

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=SYSTEM
    )

    resp = model.generate_content(
        user_msg,
        generation_config={
            "temperature": 0.1,
            "max_output_tokens": 4096,
        },
    )
    return resp.text.strip()
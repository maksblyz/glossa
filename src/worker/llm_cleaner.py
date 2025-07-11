import os, textwrap, json, requests
SYSTEM = """
You are an expert academic document analyzer. Your job is to convert raw text chunks into a structured JSON array describing components to render. You MUST follow all rules precisely.

**Component Types:**
1. **Heading**: Section titles and headers
   - `component`: "Heading"
   - `props`: { "text": string, "level": number (1-6), "sectionNumber": string? }

2. **Text**: Body paragraphs and sentences
   - `component`: "Text" 
   - `props`: { "text": string, "style": "paragraph" | "sentence" }

3. **Equation**: Mathematical formulas
   - `component`: "Equation"
   - `props`: { "latex": string, "number": string?, "display": boolean }

4. **List**: Ordered or unordered lists
   - `component`: "List"
   - `props`: { "items": string[], "ordered": boolean, "style": "bullet" | "number" | "letter" }

5. **Blockquote**: Quotes and callouts
   - `component`: "Blockquote"
   - `props`: { "text": string, "citation": string? }

6. **Code**: Code blocks or inline code
   - `component`: "Code"
   - `props`: { "code": string, "language": string?, "inline": boolean }

**Formatting Rules:**
1. **Structure**: Return ONLY a valid JSON array of component objects
2. **Clickable Units**: Every distinct unit (sentence, equation, blockquote) should be a separate component
3. **Sentence-Level Granularity**: Break paragraphs into individual sentences. Each sentence should be a separate "Text" component with style "sentence"
4. **Headings**: Identify numbered section titles (e.g., "1.2 Supervised learning"). Extract section numbers
5. **Equations**: Identify LaTeX equations and extract equation numbers if present
6. **Lists**: Group consecutive list items into List components
7. **Clean Text**: Remove page numbers and unnecessary whitespace
8. **Semantic Grouping**: Group related content logically
9. **LaTeX Matrix Formatting**: For matrices and vectors, use proper LaTeX syntax:
   - Use `&` to separate columns within a row
   - Use `\\` to separate rows
   - For row vectors, use `[a & b & c]` format
   - For column vectors, use `\\begin{bmatrix} a \\\\ b \\\\ c \\end{bmatrix}` format
   - For matrices, use `\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}` format
   - Avoid vertical stacking unless the original is clearly a column vector
10. **Inline Math Detection**: Wrap all mathematical expressions in LaTeX delimiters:
    - Variables with subscripts: `$f_c(x; \\theta)$` not `f_c(x; θ)`
    - Summations: `$\\sum_{c=1}^C f_c$` not `∑_{c=1}^C f_c`
    - Fractions: `$\\frac{a}{b}$` not `a/b`
    - Greek letters: `$\\theta$` not `θ`
    - Mathematical operators: `$\\leq$` not `≤`
    - Any mathematical notation should be wrapped in `$...$` for inline math

**Output Format:**
Return ONLY a valid JSON array (no markdown, no code blocks, no explanations). Example:
[
  {
    "component": "Heading",
    "props": {
      "text": "1.2 Supervised Learning",
      "level": 2,
      "sectionNumber": "1.2"
    }
  },
  {
    "component": "Text",
    "props": {
      "text": "One way to define the problem is through supervised learning.",
      "style": "sentence"
    }
  },
  {
    "component": "Text",
    "props": {
      "text": "Since $f_c(x; \\theta)$ returns the probability of class label $c$, we require $0 \\leq f_c \\leq 1$ for each $c$, and $\\sum_{c=1}^C f_c = 1$.",
      "style": "sentence"
    }
  },
  {
    "component": "Equation", 
    "props": {
      "latex": "\\theta = \\underset{\\theta}{\\mathrm{argmin}} \\, \\mathcal{L}(\\theta)",
      "number": "(1.6)",
      "display": true
    }
  },
  {
    "component": "Equation",
    "props": {
      "latex": "\\sigma(\\mathbf{z})_i = \\frac{e^{z_i}}{\\sum_{j=1}^K e^{z_j}}",
      "number": "(2.1)",
      "display": true
    }
  },
  {
    "component": "Equation",
    "props": {
      "latex": "\\mathbf{z} = \\begin{bmatrix} z_1 & z_2 & \\cdots & z_K \\end{bmatrix}",
      "display": true
    }
  }
]
"""

PROMPT = textwrap.dedent("""
Convert the following text chunks into a structured JSON array of components. Follow the system prompt rules exactly.

**Input chunks:**
{}

**Output JSON array:**
""")

def components_from_chunks(chunks: list[dict]) -> list[dict]:
    """Convert text chunks into structured component descriptions"""
    text_chunks = [c.get("content", "") for c in chunks if c.get("content")]
    user_msg = PROMPT.format("\n".join(text_chunks))

    DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")
    if not DEEPSEEK_API_KEY:
        raise ValueError("DEEPSEEK_API_KEY environment variable not set")

    # DeepSeek API endpoint
    url = "https://api.deepseek.com/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user_msg}
        ],
        "temperature": 0.1,
        "max_tokens": 8192
    }
    
    resp = requests.post(url, headers=headers, json=data)
    resp.raise_for_status()
    
    response_data = resp.json()
    resp = response_data["choices"][0]["message"]["content"]
    
    try:
        # Clean the response text - remove markdown code blocks if present
        response_text = resp.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```json'):
            response_text = response_text[7:]  # Remove ```json
        if response_text.startswith('```'):
            response_text = response_text[3:]  # Remove ```
        if response_text.endswith('```'):
            response_text = response_text[:-3]  # Remove trailing ```
        
        response_text = response_text.strip()
        
        # Try to parse the JSON response
        try:
            components = json.loads(response_text)
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Response length: {len(response_text)}")
            print(f"First 200 chars: {response_text[:200]}")
            print(f"Last 200 chars: {response_text[-200:]}")
            
            # Try to fix common JSON issues
            # Remove any trailing incomplete objects
            if response_text.rstrip().endswith(','):
                response_text = response_text.rstrip()[:-1]
            
            # Try to find the last complete object
            last_complete = response_text.rfind('}')
            if last_complete > 0:
                # Find the matching opening bracket
                bracket_count = 0
                for i in range(last_complete, -1, -1):
                    if response_text[i] == '}':
                        bracket_count += 1
                    elif response_text[i] == '{':
                        bracket_count -= 1
                        if bracket_count == 0:
                            # Found the start of the last complete object
                            response_text = response_text[:i] + ']'
                            break
            
            # Try parsing again
            components = json.loads(response_text)
        
        # Validate that it's a list
        if not isinstance(components, list):
            raise ValueError("Response is not a list")
            
        # Validate each component has required fields
        for i, component in enumerate(components):
            if not isinstance(component, dict):
                raise ValueError(f"Component {i} is not a dictionary")
            if "component" not in component:
                raise ValueError(f"Component {i} missing 'component' field")
            if "props" not in component:
                raise ValueError(f"Component {i} missing 'props' field")
                
        return components
        
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON response: {e}")
        print(f"Raw response: {resp}")
        # Return a fallback structure
        return [
            {
                "component": "Text",
                "props": {
                    "text": "Error: Could not parse document structure",
                    "style": "paragraph"
                }
            }
        ]
    except Exception as e:
        print(f"Error processing components: {e}")
        return [
            {
                "component": "Text", 
                "props": {
                    "text": "Error: Could not process document",
                    "style": "paragraph"
                }
            }
        ]

# Keep the old function for backward compatibility
def tsx_from_chunks(chunks: list[dict]) -> str:
    """Legacy function that converts chunks to HTML - kept for compatibility"""
    components = components_from_chunks(chunks)
    
    # Convert components back to HTML for backward compatibility
    html_parts = ['<div class="academic-paper">']
    
    for component in components:
        comp_type = component["component"]
        props = component["props"]
        
        if comp_type == "Heading":
            level = props.get("level", 2)
            text = props.get("text", "")
            section_num = props.get("sectionNumber", "")
            
            if section_num:
                html_parts.append(f'<h{level}><span class="section-number">{section_num}</span> {text}</h{level}>')
            else:
                html_parts.append(f'<h{level}>{text}</h{level}>')
                
        elif comp_type == "Text":
            text = props.get("text", "")
            style = props.get("style", "paragraph")
            
            if style == "sentence":
                html_parts.append(f'<span class="clickable-sentence">{text}</span>')
            else:
                html_parts.append(f'<p><span class="clickable-sentence">{text}</span></p>')
                
        elif comp_type == "Equation":
            latex = props.get("latex", "")
            number = props.get("number", "")
            display = props.get("display", True)
            
            if display:
                html_parts.append(f'<span class="equation clickable-sentence">')
                html_parts.append(f'  <span class="equation-content">$$ {latex} $$</span>')
                if number:
                    html_parts.append(f'  <span class="equation-number">{number}</span>')
                html_parts.append('</span>')
            else:
                html_parts.append(f'<span class="clickable-sentence">${latex}$</span>')
                
        elif comp_type == "List":
            items = props.get("items", [])
            ordered = props.get("ordered", False)
            
            tag = "ol" if ordered else "ul"
            html_parts.append(f'<{tag}>')
            for item in items:
                html_parts.append(f'  <li><span class="clickable-sentence">{item}</span></li>')
            html_parts.append(f'</{tag}>')
            
        elif comp_type == "Blockquote":
            text = props.get("text", "")
            citation = props.get("citation", "")
            
            html_parts.append(f'<blockquote class="clickable-sentence">{text}')
            if citation:
                html_parts.append(f'<cite>— {citation}</cite>')
            html_parts.append('</blockquote>')
            
        elif comp_type == "Code":
            code = props.get("code", "")
            inline = props.get("inline", False)
            
            if inline:
                html_parts.append(f'<code class="clickable-sentence">{code}</code>')
            else:
                html_parts.append(f'<pre><code class="clickable-sentence">{code}</code></pre>')
    
    html_parts.append('</div>')
    return '\n'.join(html_parts)
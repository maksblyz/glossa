import os, textwrap, json
from openai import OpenAI
SYSTEM = """
You are an expert academic document analyzer. Your job is to convert raw text chunks and vision objects into a structured JSON array describing components to render. You MUST follow all rules precisely and use all provided context.

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

7. **Image**: Standalone images
   - `component`: "Image"
   - `props`: { "src": string, "alt": string, "width": number?, "height": number?, "relative_x": number, "relative_y": number, "relative_width": number, "relative_height": number, "group_id": string, "is_inline": boolean }

8. **InlineImage**: Images that are inline with text
   - `component`: "InlineImage"
   - `props`: { "src": string, "alt": string, "relative_x": number, "relative_y": number, "relative_width": number, "relative_height": number, "group_id": string, "is_inline": boolean }

9. **ImageRow**: A row of grouped images (same group_id)
   - `component`: "ImageRow"
   - `props`: { "images": Array<{ src: string, alt: string, relative_x: number, relative_y: number, relative_width: number, relative_height: number, group_id: string, is_inline: boolean }> }

10. **Table**: Data tables (no caption prop)
   - `component`: "Table"
   - `props`: { "headers": string[], "rows": string[][] }

11. **TableCaption**: Table captions (for use immediately after a Table)
   - `component`: "TableCaption"
   - `props`: { "text": string }

**Formatting Rules:**
1. **Structure**: Return ONLY a valid JSON array of component objects
2. **Clickable Units**: Every distinct unit (sentence, equation, blockquote, image, table) should be a separate component
3. **Sentence-Level Granularity**: Break paragraphs into individual sentences. Each sentence should be a separate "Text" component with style "sentence"
4. **Headings**: Identify numbered section titles (e.g., "1.2 Supervised learning"). Extract section numbers
5. **Equations**: Identify LaTeX equations and extract equation numbers if present
6. **Lists**: Group consecutive list items into List components
7. **Images**: Use all provided context: If images share a `group_id`, output as an `ImageRow`. If `is_inline`, use `InlineImage`. If alone, use `Image`. Use `relative_x`, `relative_y`, `relative_width`, and `relative_height` for layout. Never hardcode layout—always use the context provided.
8. **Tables**: If a table has a caption, output a `Table` component (without a caption prop) immediately followed by a `TableCaption` component with the caption text. Use the provided table information to create Table components with headers and rows only.
9. **Clean Text**: Remove page numbers and unnecessary whitespace
10. **Semantic Grouping**: Group related content logically
11. **LaTeX Matrix Formatting**: For matrices and vectors, use proper LaTeX syntax:
   - Use `&` to separate columns within a row
   - Use `\\` to separate rows
   - For row vectors, use `[a & b & c]` format
   - For column vectors, use `\\begin{bmatrix} a \\\\ b \\\\ c \\end{bmatrix}` format
   - For matrices, use `\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}` format
   - Avoid vertical stacking unless the original is clearly a column vector
12. **Inline Math Detection**: Wrap all mathematical expressions in LaTeX delimiters:
    - Variables with subscripts: `$f_c(x; \\theta)$` not `f_c(x; θ)`
    - Summations: `$\\sum_{c=1}^C f_c$` not `∑_{c=1}^C f_c`
    - Fractions: `$\\frac{a}{b}$` not `a/b`
    - Greek letters: `$\\theta$` not `θ`
    - Mathematical operators: `$\\leq$` not `≤`
    - Any mathematical notation should be wrapped in `$...$` for inline math
13. **JSON String Escaping**: All backslashes (`\\`) in the output JSON string must be properly escaped. This is especially important for LaTeX code. For example, to represent the LaTeX `\\theta`, you must write it as `\\\\theta` in the final JSON. IMPORTANT: When writing LaTeX in JSON, double-escape all backslashes: `\\frac{a}{b}` becomes `\\\\frac{a}{b}` in the JSON output.

**Output Format:**
Return ONLY a valid JSON array (no markdown, no code blocks, no explanations). Use the context provided for all layout and grouping decisions.
"""

PROMPT = textwrap.dedent("""
Convert the following text chunks into a structured JSON array of components. Follow the system prompt rules exactly.

**Input chunks:**
{}

**Output JSON array:**
""")

def components_from_chunks(chunks: list[dict], images: list[dict] = None, tables: list[dict] = None) -> list[dict]:
    """Convert text chunks into structured component descriptions"""
    text_chunks = [c.get("content", "") for c in chunks if c.get("content")]
    
    # Prepare image and table information for LLM
    image_info = ""
    if images:
        image_info = "\n\n**Images found in document:**\n"
        for i, img in enumerate(images):
            image_info += f"- Image {i+1}: {img.get('filename', 'unknown')} "
            if 'cdn_url' in img:
                image_info += f"(URL: {img['cdn_url']}) "
            if 'relative_position' in img:
                pos = img['relative_position']
                image_info += f"(Position: x={pos['x']:.2f}, y={pos['y']:.2f}, w={pos['width']:.2f}, h={pos['height']:.2f}) "
            if 'dimensions' in img:
                dims = img['dimensions']
                image_info += f"(Size: {dims['width']}x{dims['height']}px) "
            image_info += "\n"
    
    table_info = ""
    if tables:
        table_info = "\n\n**Tables found in document:**\n"
        for i, table in enumerate(tables):
            table_info += f"- Table {i+1}: {len(table.get('content', {}).get('rows', []))} rows "
            if 'bbox' in table:
                table_info += f"(Position: {table['bbox']}) "
            table_info += "\n"
    
    user_msg = PROMPT.format("\n".join(text_chunks) + image_info + table_info)

    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable not set")

    # Initialize OpenAI client
    client = OpenAI(api_key=OPENAI_API_KEY)
    
    # Make API call to GPT-4o-mini
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user_msg}
        ],
        temperature=0.1,
        max_tokens=8192
    )
    
    resp = response.choices[0].message.content
    
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
            # Fix invalid escape sequences - be more careful
            import re
            # Fix common LaTeX escape issues
            response_text = re.sub(r'\\(?!["\\/bfnrt])', r'\\\\', response_text)
            
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
            try:
                components = json.loads(response_text)
            except json.JSONDecodeError as e2:
                print(f"Still failed after fixes: {e2}")
                # Return a simple fallback
                return [
                    {
                        "component": "Text",
                        "props": {
                            "text": "Error: Could not parse document structure due to JSON formatting issues",
                            "style": "paragraph"
                        }
                    }
                ]
        
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
                
        elif comp_type == "Image":
            src = props.get("src", "")
            alt = props.get("alt", "")
            caption = props.get("caption", "")
            width = props.get("width", "")
            height = props.get("height", "")
            
            html_parts.append(f'<div class="image-container clickable-sentence">')
            html_parts.append(f'  <img src="{src}" alt="{alt}" width="{width}" height="{height}" class="image-content" style="max-width: 100%; height: auto; display: block; margin: 1rem auto;">')
            if caption:
                html_parts.append(f'  <div class="image-caption">{caption}</div>')
            html_parts.append('</div>')
            
        elif comp_type == "Table":
            headers = props.get("headers", [])
            rows = props.get("rows", [])
            
            html_parts.append(f'<div class="table-container clickable-sentence">')
            html_parts.append(f'  <table class="table-content" style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.875rem;">')
            
            if headers:
                html_parts.append(f'    <thead>')
                html_parts.append(f'      <tr>')
                for header in headers:
                    html_parts.append(f'        <th style="border: 1px solid #d1d5db; padding: 0.5rem; background-color: #f9fafb; font-weight: bold; text-align: left;">{header}</th>')
                html_parts.append(f'      </tr>')
                html_parts.append(f'    </thead>')
            
            html_parts.append(f'    <tbody>')
            for row in rows:
                html_parts.append(f'      <tr>')
                for cell in row:
                    html_parts.append(f'        <td style="border: 1px solid #d1d5db; padding: 0.5rem; text-align: left;">{cell}</td>')
                html_parts.append(f'      </tr>')
            html_parts.append(f'    </tbody>')
            html_parts.append(f'  </table>')
            
            html_parts.append('</div>')
    
    html_parts.append('</div>')
    return '\n'.join(html_parts)
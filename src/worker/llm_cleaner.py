import os, textwrap, json, asyncio, re
import httpx
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
   - `props": { "text": string, "citation": string? }

6. **Code**: Code blocks or inline code
   - `component": "Code"
   - `props": { "code": string, "language": string?, "inline": boolean }

7. **Image**: Standalone images
   - `component": "Image"
   - `props": { "src": string, "alt": string, "width": number?, "height": number?, "relative_x": number, "relative_y": number, "relative_width": number, "relative_height": number, "group_id": string, "is_inline": boolean }

8. **InlineImage**: Images that are inline with text
   - `component": "InlineImage"
   - `props": { "src": string, "alt": string, "relative_x": number, "relative_y": number, "relative_width": number, "relative_height": number, "group_id": string, "is_inline": boolean }

9. **ImageRow**: A row of grouped images (same group_id)
   - `component": "ImageRow"
   - `props": { "images": Array<{ src: string, alt: string, relative_x: number, relative_y: number, relative_width: number, relative_height: number, group_id: string, is_inline: boolean }> }

10. **Table**: Data tables (treated as images)
   - `component": "Table"
   - `props": { "src": string, "alt": string, "width": number?, "height": number?, "relative_x": number, "relative_y": number, "relative_width": number, "relative_height": number, "group_id": string, "is_inline": boolean }

11. **TableRow**: A row of grouped tables (same group_id)
   - `component": "TableRow"
   - `props": { "tables": Array<{ src: string, alt: string, relative_x: number, relative_y: number, relative_width: number, relative_height: number, group_id: string, is_inline: boolean }> }

**Formatting Rules:**
1. **Structure**: Return ONLY a valid JSON array of component objects
2. **Clickable Units**: Every distinct unit (sentence, equation, blockquote, image, table) should be a separate component
3. **Sentence-Level Granularity**: Break paragraphs into individual sentences. Each sentence should be a separate "Text" component with style "sentence"
4. **Headings**: Identify numbered section titles (e.g., "1.2 Supervised learning"). Extract section numbers
5. **Equations**: Identify LaTeX equations and extract equation numbers if present
6. **Lists**: Group consecutive list items into List components
7. **Images**: Use all provided context: If images share a `group_id`, output as an `ImageRow`. If `is_inline`, use `InlineImage`. If alone, use `Image`. Use `relative_x`, `relative_y`, `relative_width`, and `relative_height` for layout. Never hardcode layout—always use the context provided.
8. **Tables**: Tables are now treated as images. Use all provided context: If tables share a `group_id`, output as a `TableRow`. If `is_inline`, use `Table` with `is_inline: true`. If alone, use `Table`. Use `relative_x`, `relative_y`, `relative_width`, and `relative_height` for layout. Never hardcode layout—always use the context provided.
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

MAX_OUTPUT = 1200
CHUNK_SIZE = 10
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

async def fetch_completion(client, prompt):
    headers = {
        "Authorization": f"Bearer {os.environ['DEEPSEEK_API_KEY']}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": MAX_OUTPUT,
        "temperature": 0.1,
    }
    resp = await client.post(DEEPSEEK_API_URL, headers=headers, json=payload)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]

def smart_chunkify(chunks, max_chars=1200):
    groups = []
    current = []
    current_len = 0
    for chunk in chunks:
        chunk_str = chunk.get("content", "")
        if current and (current_len + len(chunk_str)) > max_chars:
            groups.append(current)
            current = []
            current_len = 0
        current.append(chunk)
        current_len += len(chunk_str)
    if current:
        groups.append(current)
    return groups

def build_figure_mapping(text_chunks, image_objects, table_objects=None):
    """
    Build a mapping from figure/table references (e.g., 'Figure 1', 'Table 1') to image src URLs.
    Uses order of appearance per page if captions are not available.
    Returns: dict mapping 'Figure 1' -> image src, 'Table 1' -> table src
    """
    figure_map = {}
    # Find all figure and table references in text
    figure_ref_re = re.compile(r"(Figure|Fig\.?)[ ]?(\d+)", re.IGNORECASE)
    table_ref_re = re.compile(r"(Table|Tab\.?)[ ]?(\d+)", re.IGNORECASE)
    
    # Group images by page
    images_by_page = {}
    for img in image_objects:
        if img.get('type') != 'image':
            continue
        page = img.get('page', 1)
        images_by_page.setdefault(page, []).append(img)
    
    # Group tables by page
    tables_by_page = {}
    if table_objects:
        for table in table_objects:
            if table.get('type') != 'table':
                continue
            page = table.get('page', 1)
            tables_by_page.setdefault(page, []).append(table)
    
    # For each text chunk, look for figure and table references
    for chunk in text_chunks:
        page = chunk.get('page', 1)
        content = chunk.get('content', '')
        
        # Handle figure references
        for match in figure_ref_re.finditer(content):
            fig_num = int(match.group(2))
            ref = match.group(0)
            # Map by order of appearance on the page
            imgs = images_by_page.get(page, [])
            if 0 < fig_num <= len(imgs):
                img = imgs[fig_num - 1]
                src = img.get('cdn_url') or img.get('filename')
                if src:
                    figure_map[ref] = src
        
        # Handle table references
        for match in table_ref_re.finditer(content):
            table_num = int(match.group(2))
            ref = match.group(0)
            # Map by order of appearance on the page
            tables = tables_by_page.get(page, [])
            if 0 < table_num <= len(tables):
                table = tables[table_num - 1]
                src = table.get('cdn_url') or table.get('filename')
                if src:
                    figure_map[ref] = src
    
    return figure_map

def build_prompt(text_chunks, image_info, table_info, figure_map=None):
    prompt = PROMPT.format("\n".join(text_chunks) + image_info + table_info)
    if figure_map:
        prompt += "\n\n**Figure Mapping:**\n"
        for ref, src in figure_map.items():
            prompt += f"- {ref}: {src}\n"
        prompt += "\nIf you see a reference to a figure (e.g., 'Figure 1') or table (e.g., 'Table 1'), use the corresponding image/table src from the mapping above for the 'src' property."
    return prompt

async def process_chunks(chunk_groups, image_info, table_info, figure_map=None):
    async with httpx.AsyncClient(http2=True, timeout=60) as client:
        tasks = [fetch_completion(client, build_prompt(group, image_info, table_info, figure_map)) for group in chunk_groups]
        results = await asyncio.gather(*tasks)
    return results

def components_from_chunks(chunks: list[dict], images: list[dict] = None, tables: list[dict] = None) -> list[dict]:
    """Convert text chunks into structured component descriptions"""
    text_chunks = [c for c in chunks if c.get("content")]
    if not text_chunks:
        return []

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
            table_info += f"- Table {i+1}: {table.get('filename', 'unknown')} "
            if 'cdn_url' in table:
                table_info += f"(URL: {table['cdn_url']}) "
            if 'relative_position' in table:
                pos = table['relative_position']
                table_info += f"(Position: x={pos['x']:.2f}, y={pos['y']:.2f}, w={pos['width']:.2f}, h={pos['height']:.2f}) "
            if 'dimensions' in table:
                dims = table['dimensions']
                table_info += f"(Size: {dims['width']}x{dims['height']}px) "
            table_info += "\n"

    # Use smart chunking
    chunk_groups = smart_chunkify(text_chunks, max_chars=1200)
    # Each group is a list of chunk dicts; convert to list of strings for prompt
    chunk_groups_str = [[c.get("content", "") for c in group] for group in chunk_groups]
    # Build figure mapping
    figure_map = build_figure_mapping(text_chunks, images or [], tables) if images or tables else None
    loop = asyncio.get_event_loop()
    llm_results = loop.run_until_complete(process_chunks(chunk_groups_str, image_info, table_info, figure_map))

    # Merge and parse all results
    all_components = []
    for resp in llm_results:
        response_text = resp.strip()
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        try:
            components = json.loads(response_text)
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Response length: {len(response_text)}")
            print(f"First 200 chars: {response_text[:200]}")
            print(f"Last 200 chars: {response_text[-200:]}")
            import re
            response_text = re.sub(r'\\(?!["\\/bfnrt])', r'\\\\', response_text)
            if response_text.rstrip().endswith(','):
                response_text = response_text.rstrip()[:-1]
            last_complete = response_text.rfind('}')
            if last_complete > 0:
                bracket_count = 0
                for i in range(last_complete, -1, -1):
                    if response_text[i] == '}':
                        bracket_count += 1
                    elif response_text[i] == '{':
                        bracket_count -= 1
                        if bracket_count == 0:
                            response_text = response_text[:i] + ']'
                            break
            try:
                components = json.loads(response_text)
            except json.JSONDecodeError as e2:
                print(f"Still failed after fixes: {e2}")
                components = [
                    {
                        "component": "Text",
                        "props": {
                            "text": "Error: Could not parse document structure due to JSON formatting issues",
                            "style": "paragraph"
                        }
                    }
                ]
        if not isinstance(components, list):
            components = [
                {
                    "component": "Text",
                    "props": {
                        "text": "Error: LLM did not return a list of components",
                        "style": "paragraph"
                    }
                }
            ]
        # --- Post-processing: fix 'src': 'Figure1' etc. ---
        if figure_map:
            for comp in components:
                if comp.get('component') in ['Image', 'Table']:
                    src = comp.get('props', {}).get('src', '')
                    # Try to match 'Figure1', 'Fig. 1', etc.
                    for ref, url in figure_map.items():
                        if src.replace(' ', '').lower() == ref.replace(' ', '').lower() or src.lower() == ref.lower().replace(' ', ''):
                            comp['props']['src'] = url
        # --- End post-processing ---
        for i, component in enumerate(components):
            if not isinstance(component, dict) or "component" not in component or "props" not in component:
                continue
            all_components.append(component)
    return all_components

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
            src = props.get("src", "")
            alt = props.get("alt", "")
            width = props.get("width", "")
            height = props.get("height", "")
            
            html_parts.append(f'<div class="table-container clickable-sentence">')
            html_parts.append(f'  <img src="{src}" alt="{alt}" width="{width}" height="{height}" class="table-content" style="max-width: 100%; height: auto; display: block; margin: 1rem auto;">')
            html_parts.append('</div>')
    
    html_parts.append('</div>')
    return '\n'.join(html_parts)
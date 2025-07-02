# LLM-Based PDF Formatting

This document describes the new LLM-based approach to PDF text formatting in Glossa.

## Overview

Instead of using complex extractors to identify document structure, we now use:
1. **Text Extraction**: Simple text extraction to get raw content
2. **LLM Processing**: GPT-4o-mini to clean and format the text
3. **Vision Extraction**: Keep vision-based extractors only for images and tables

## Architecture

### Components

1. **Text Extractor** (`text_extractor.py`)
   - Extracts text chunks from PDF pages
   - Uses spaCy for sentence segmentation
   - Preserves word positions for context

2. **LLM Cleaner** (`llm_cleaner.py`)
   - Processes text chunks through GPT-4o-mini
   - Identifies headings, paragraphs, lists, etc.
   - Outputs clean TSX with semantic HTML

3. **Vision Extractors** (`image_extractor.py`, `table_extractor.py`)
   - Extract images and tables using computer vision
   - No OCR - let LLM handle text formatting

4. **Formatted PDF Viewer** (`FormattedPDFViewer.tsx`)
   - Displays LLM-formatted content
   - Shows images and tables separately
   - Uses Tailwind Typography for styling

### Data Flow

1. PDF uploaded → Blob storage
2. Worker processes PDF:
   - Extract text chunks
   - Process through LLM for formatting
   - Extract images/tables with vision
   - Store in database
3. Frontend displays formatted content

## Formatting Rules

The LLM is instructed to use these semantic HTML elements:

- `<h1>` - Main document titles
- `<h2>` - Major section headers
- `<h3>` - Subsection headers
- `<h4>` - Minor headers
- `<p>` - Body paragraphs
- `<blockquote>` - Quotes and callouts
- `<code>` - Inline code/formulas
- `<pre>` - Code blocks
- `<ul>/<ol>` - Lists
- `<strong>/<em>` - Bold/italic text
- `<figcaption>` - Image/table captions

## Benefits

1. **Faster Development**: No need to write complex extraction rules
2. **Better Quality**: LLM understands context and semantics
3. **Cheaper Maintenance**: Single LLM prompt vs. multiple extractors
4. **More Flexible**: Easy to adjust formatting rules
5. **Better Results**: LLM can handle edge cases and variations

## Testing

Run the LLM test:
```bash
npm run test-llm
```

## Environment Variables

Required:
- `OPENAI_API_KEY` - OpenAI API key for LLM processing
- `DATABASE_URL` - PostgreSQL connection string
- `UPSTASH_REDIS_REST_URL` - Redis connection URL
- `UPSTASH_REDIS_REST_TOKEN` - Redis authentication token

## Future Improvements

1. **Streaming**: Process text in chunks for better performance
2. **Caching**: Cache LLM results to reduce API costs
3. **Custom Prompts**: Allow users to customize formatting rules
4. **Multi-language**: Support for non-English documents
5. **Document Types**: Specialized prompts for different document types 
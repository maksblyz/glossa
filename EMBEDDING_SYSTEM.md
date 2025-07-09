# Embedding and Context Retrieval System

This document describes the implementation of the chunking, embedding, and dynamic context retrieval system for the Glossa PDF viewer.

## Overview

The system provides intelligent context retrieval when users click on sentences or equations in PDF documents. It uses:

1. **Chunking**: Breaks down PDF content into meaningful segments
2. **Vector Embeddings**: Uses Sentence-BERT to create semantic representations
3. **Chroma Vector Database**: Stores and retrieves embeddings efficiently
4. **Dynamic Context Assembly**: Retrieves relevant context in real-time

## Architecture

### 1. Chunking and Embedding (Pre-processing)

When a PDF is processed, the system:

1. **Extracts formatted content** from the PDF using the existing LLM-based formatter
2. **Chunks the content** into meaningful segments:
   - Text sentences (minimum 10 characters)
   - Equations (extracted from HTML)
   - Headings (for context)
3. **Generates embeddings** using the `all-MiniLM-L6-v2` model
4. **Stores in Chroma** with metadata linking back to the original content

### 2. On-Click Context Retrieval

When a user clicks on content:

1. **Immediate Context**: Gets the sentence before and after the clicked element
2. **Semantic Search**: Finds semantically similar chunks from anywhere in the document
3. **Context Assembly**: Combines immediate and semantic context
4. **LLM Explanation**: Generates a comprehensive explanation using the assembled context

## Components

### EmbeddingService (`src/worker/embedding_service.py`)

Core service that handles:
- Text chunking at sentence level
- Equation extraction from HTML
- Heading extraction for context
- Chroma database operations
- Semantic search functionality

### PDF Worker Integration (`src/worker/pdf_worker.py`)

Updated to:
- Create embeddings during PDF processing
- Store embedding metadata in the database
- Link embeddings to the original formatted content

### Context API (`src/app/api/context/route.ts`)

REST endpoint that:
- Accepts file name and clicked sentence
- Calls Python script to retrieve context
- Generates explanations using Gemini
- Returns structured context and explanation

### Frontend Integration (`src/components/FormattedPDFViewer.tsx`)

Updated to:
- Make API calls when content is clicked
- Display contextual explanations in popups
- Handle both text and equation content types

## Usage

### Testing the System

1. **Test embeddings locally**:
   ```bash
   npm run test-embeddings
   ```

2. **Process a PDF**:
   ```bash
   npm run worker
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

### API Usage

The context API accepts POST requests to `/api/context`:

```json
{
  "file_name": "document.pdf",
  "sentence": "The clicked sentence content",
  "type": "text" // or "equation"
}
```

Returns:
```json
{
  "context": {
    "clicked_sentence": "...",
    "immediate_context": {
      "previous": "...",
      "current": "...",
      "next": "..."
    },
    "similar_chunks": [...],
    "clicked_chunk_metadata": {...}
  },
  "explanation": "Generated explanation..."
}
```

## Configuration

### Environment Variables

- `GEMINI_API_KEY`: Required for generating explanations
- `DATABASE_URL`: PostgreSQL connection for storing metadata
- `UPSTASH_REDIS_REST_URL`: Redis for job queue
- `UPSTASH_REDIS_REST_TOKEN`: Redis authentication

### Chroma Database

- **Location**: `./chroma_db` (relative to worker directory)
- **Collections**: One per PDF file (named `pdf_<filename>`)
- **Persistence**: Local file-based storage

## Performance Considerations

1. **Embedding Generation**: Happens once during PDF processing
2. **Search Performance**: Chroma provides fast similarity search
3. **Memory Usage**: Sentence-BERT model loaded once per worker process
4. **Storage**: Embeddings stored locally, metadata in PostgreSQL

## Future Improvements

1. **Batch Processing**: Process multiple PDFs simultaneously
2. **Caching**: Cache frequently accessed embeddings
3. **Custom Models**: Allow users to choose different embedding models
4. **Cross-Document Search**: Search across multiple PDFs
5. **User Feedback**: Learn from user interactions to improve relevance

## Troubleshooting

### Common Issues

1. **Chroma not found**: Ensure Chroma is installed and the database directory is writable
2. **Model download fails**: Check internet connection for initial model download
3. **Memory issues**: Consider using a smaller embedding model for large documents
4. **API timeouts**: Increase timeout values for large documents

### Debugging

1. Check worker logs for embedding creation
2. Verify Chroma collections exist
3. Test the context API directly
4. Check browser console for frontend errors 
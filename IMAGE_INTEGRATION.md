# Image Integration Implementation

This document describes the implementation of image integration in the Glossa PDF processing pipeline.

## Overview

The image integration system allows PDFs to include images that are:
- **Extracted** from the original PDF with precise positioning
- **Analyzed** for layout relationships and spatial context
- **Formatted** by the LLM into semantic HTML with proper styling
- **Displayed** in the frontend with clickable functionality
- **Stored** efficiently with duplicate detection

## Architecture

### 1. Image Extraction (`src/worker/image_extractor.py`)

**Features:**
- Extracts images from PDF using PyMuPDF (fitz)
- Calculates precise bounding boxes and relative positioning
- Generates unique filenames using MD5 hash to prevent duplicates
- Saves images to `public/pdf-assets/` for web access
- Handles various image formats (PNG, JPEG, etc.)

**Key Methods:**
- `extract(pdf_path)`: Main extraction method
- Duplicate detection using content hash
- Relative positioning calculation (0-1 scale)

### 2. Layout Analysis (`src/worker/layout_analyzer.py`)

**Features:**
- Analyzes spatial relationships between text and images
- Identifies image groups (side-by-side, stacked, complex)
- Finds text-image relationships for caption generation
- Generates layout instructions for the LLM

**Key Methods:**
- `analyze_layout(text_chunks, image_objects)`: Main analysis
- `_find_image_groups()`: Groups related images
- `_find_text_image_relationships()`: Links text to images
- `generate_layout_instructions()`: Creates LLM instructions

### 3. LLM Integration (`src/worker/llm_cleaner.py`)

**Features:**
- Processes images alongside text through Gemini 2.5 Flash
- Generates semantic HTML with proper image placement
- Creates clickable image containers with captions
- Handles various image layouts (single, side-by-side, stacked)

**Image HTML Templates:**
```html
<!-- Single Image -->
<div class="image-container clickable-sentence" style="width: 60%; margin: 1em auto;">
  <img src="/api/pdf/{filename}/{image_filename}" alt="Figure 1" style="width: 100%; height: auto;" />
  <div class="image-caption">Figure 1: {caption}</div>
</div>

<!-- Side-by-side Images -->
<div class="image-row clickable-sentence" style="display: flex; gap: 1em; margin: 1em 0;">
  <div class="image-container" style="flex: 1;">
    <img src="/api/pdf/{filename}/{left_image}" alt="Figure 1a" style="width: 100%; height: auto;" />
    <div class="image-caption">Figure 1a: {left_caption}</div>
  </div>
  <div class="image-container" style="flex: 1;">
    <img src="/api/pdf/{filename}/{right_image}" alt="Figure 1b" style="width: 100%; height: auto;" />
    <div class="image-caption">Figure 1b: {right_caption}</div>
  </div>
</div>
```

### 4. PDF Worker Integration (`src/worker/pdf_worker.py`)

**Updates:**
- Enabled image extraction alongside text extraction
- Passes images to LLM for formatting
- Stores image objects in database with proper metadata
- Handles page dimensions for accurate positioning

### 5. API Endpoint (`src/app/api/pdf/[file]/[image]/route.ts`)

**Features:**
- Serves images from `public/pdf-assets/` directory
- Supports multiple image formats (PNG, JPEG, GIF, WebP, SVG)
- Implements proper caching headers (1 year)
- Handles 404 errors gracefully

### 6. Frontend Integration (`src/components/FormattedPDFViewer.tsx`)

**Features:**
- Displays images embedded in LLM-generated HTML
- Maintains clickable functionality for images
- Supports responsive image sizing
- Preserves academic paper styling

## CSS Styling (`src/app/globals.css`)

**Image-specific styles:**
```css
.image-container {
  text-align: center;
  margin: 1em auto;
  page-break-inside: avoid;
}

.image-container img {
  max-width: 100%;
  height: auto;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.image-caption {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;
  font-style: italic;
  text-align: center;
}

/* Clickable image styling */
.image-container.clickable-sentence {
  display: block !important;
  padding: 8px !important;
  margin: 4px -8px !important;
  border-radius: 8px !important;
  border: 1px solid transparent !important;
  transition: all 0.2s ease !important;
}

.image-container.clickable-sentence:hover {
  background-color: #f3f4f6 !important;
  border-color: #d1d5db !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
}
```

## Data Flow

1. **PDF Upload** → Blob storage
2. **Worker Processing**:
   - Extract text chunks
   - Extract images with positioning
   - Analyze layout relationships
   - Process through LLM with image context
   - Store formatted content and image metadata
3. **Frontend Display**:
   - Load formatted HTML with embedded images
   - Serve images via API endpoint
   - Display with clickable functionality

## Key Features

### Duplicate Detection
- Uses MD5 hash of image content to generate unique filenames
- Prevents storage of duplicate images
- Maintains referential integrity

### Precise Positioning
- Calculates relative positioning (0-1 scale) for responsive display
- Preserves original image dimensions and aspect ratios
- Handles page-specific positioning

### Layout Intelligence
- Automatically detects image relationships (side-by-side, stacked)
- Analyzes text-image proximity for caption generation
- Provides layout instructions to LLM for optimal formatting

### Clickable Images
- All images are wrapped in clickable containers
- Hover effects and selection states
- Consistent with text clickability

### Responsive Design
- Images scale appropriately within the academic paper layout
- Maintains readability across different screen sizes
- Preserves document structure

## Testing

Run the test suite to verify functionality:
```bash
cd src/worker
python test_image_integration.py
```

## Usage

1. Upload a PDF with images through the web interface
2. The worker will automatically extract and process images
3. Images will appear in the formatted PDF viewer with proper styling
4. Click on images to trigger the same context retrieval as text

## Future Enhancements

- **Image OCR**: Extract text from images for better context
- **Image Compression**: Optimize image sizes for web delivery
- **Advanced Layout**: Support for more complex image arrangements
- **Image Search**: Enable semantic search within images
- **Thumbnail Generation**: Create thumbnails for faster loading 
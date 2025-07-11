# JSON-Based Component System

This document describes the new JSON-based component system for PDF rendering in Glossa, which provides better control, safety, and extensibility compared to the previous HTML-based approach.

## Overview

The new system uses structured JSON to describe document components instead of generating raw HTML. This gives us:

- **Full Control**: Complete control over rendering, styling, and interactivity
- **Safety**: No raw HTML injection, direct React component hydration
- **Extensibility**: Easy to add new component types
- **Consistency**: Uniform styling and behavior across all components
- **Performance**: Progressive rendering and better optimization

## Architecture

### 1. LLM Processing (`src/worker/llm_cleaner.py`)

The LLM now outputs structured JSON instead of HTML:

```json
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
      "text": "One way to define the problem...",
      "style": "paragraph"
    }
  },
  {
    "component": "Equation",
    "props": {
      "latex": "\\theta = \\underset{\\theta}{\\mathrm{argmin}} \\, \\mathcal{L}(\\theta)",
      "number": "(1.6)",
      "display": true
    }
  }
]
```

### 2. Component Types

#### Heading
- **Purpose**: Section titles and headers
- **Props**: `text`, `level` (1-6), `sectionNumber` (optional)

#### Text
- **Purpose**: Body paragraphs and sentences
- **Props**: `text`, `style` ("paragraph" | "sentence")

#### Equation
- **Purpose**: Mathematical formulas
- **Props**: `latex`, `number` (optional), `display` (boolean)

#### List
- **Purpose**: Ordered or unordered lists
- **Props**: `items` (string[]), `ordered` (boolean), `style` ("bullet" | "number" | "letter")

#### Blockquote
- **Purpose**: Quotes and callouts
- **Props**: `text`, `citation` (optional)

#### Code
- **Purpose**: Code blocks or inline code
- **Props**: `code`, `language` (optional), `inline` (boolean)

### 3. Frontend Rendering (`src/components/ComponentPDFViewer.tsx`)

The frontend uses a component map to render JSON descriptions:

```typescript
function renderComponentJSX(component: Component, onComponentClick: Function): React.ReactElement {
  const { component: type, props } = component;
  
  switch (type) {
    case 'Heading':
      return <HeadingComponent {...props} />;
    case 'Text':
      return <TextComponent {...props} onClick={onComponentClick} />;
    // ... other components
  }
}
```

## Benefits

### ✅ Consistency
- Uniform styling across all components
- Centralized design system
- Easy theme switching

### ✅ Safety
- No raw HTML injection
- Type-safe component props
- Validation before rendering

### ✅ Interactivity
- Easy to add click handlers
- Modal support
- Zoom functionality
- Annotation overlays

### ✅ Performance
- Progressive rendering
- Component-level optimization
- Lazy loading support

### ✅ Extensibility
- Add new component types easily
- Custom styling per component
- Plugin architecture

### ✅ Maintainability
- Clear separation of concerns
- Easy debugging
- Testable components

## Implementation Details

### Backward Compatibility

The system maintains full backward compatibility:

1. **Dual Storage**: Both component JSON and HTML are stored
2. **Auto-Detection**: Frontend detects component data and uses appropriate viewer
3. **Fallback**: Falls back to HTML viewer for old documents

### Database Schema

The existing `pdf_objects` table stores both formats:

```sql
-- Component data
INSERT INTO pdf_objects (file, page, type, content, ...)
VALUES ('file.pdf', 1, 'components', '{"components": [...]}', ...);

-- Legacy HTML data (for backward compatibility)
INSERT INTO pdf_objects (file, page, type, content, ...)
VALUES ('file.pdf', 1, 'formatted', '{"content": "<div>...</div>"}', ...);
```

### Error Handling

- **JSON Validation**: Validates LLM output before storage
- **Fallback Components**: Provides error components for invalid data
- **Graceful Degradation**: Falls back to HTML rendering on errors

## Usage

### Testing

Test the new component system:

```bash
npm run test-components
```

### Development

1. **Add New Component Type**:
   - Update LLM prompt in `llm_cleaner.py`
   - Add component case in `ComponentPDFViewer.tsx`
   - Add styling in `globals.css`

2. **Custom Styling**:
   - Modify component-specific CSS classes
   - Use Tailwind utilities for responsive design
   - Add dark mode support

3. **Add Interactivity**:
   - Extend click handlers in component renderer
   - Add hover effects and animations
   - Implement modal dialogs

## Migration

### For Existing Documents

Existing documents continue to work without changes:

1. **Automatic Detection**: System detects component vs HTML data
2. **Seamless Switching**: Uses appropriate viewer automatically
3. **No Data Loss**: All existing functionality preserved

### For New Documents

New documents automatically use the component system:

1. **Enhanced Processing**: Better structure recognition
2. **Improved Rendering**: More consistent output
3. **Better Performance**: Optimized component rendering

## Future Enhancements

### Planned Features

1. **Image Integration**: Add Image component type
2. **Table Support**: Add Table component type
3. **Interactive Elements**: Add form and input components
4. **Custom Themes**: User-selectable styling themes
5. **Export Options**: PDF, Word, LaTeX export

### Performance Optimizations

1. **Virtual Scrolling**: For large documents
2. **Component Caching**: Cache rendered components
3. **Lazy Loading**: Load components on demand
4. **Web Workers**: Background processing

## Troubleshooting

### Common Issues

1. **LLM JSON Parsing Errors**:
   - Check LLM prompt formatting
   - Validate JSON output structure
   - Use fallback error components

2. **Component Rendering Issues**:
   - Verify component type exists in renderer
   - Check prop validation
   - Review CSS styling

3. **Performance Problems**:
   - Optimize component rendering
   - Implement pagination
   - Use React.memo for expensive components

### Debug Mode

Enable debug logging:

```typescript
// In ComponentPDFViewer.tsx
const DEBUG = process.env.NODE_ENV === 'development';
if (DEBUG) {
  console.log('Components:', components);
  console.log('Rendered components:', renderedComponents);
}
```

## Conclusion

The JSON-based component system provides a robust, extensible foundation for PDF rendering in Glossa. It offers better control, safety, and performance while maintaining full backward compatibility with existing documents.

The system is designed to grow with the application, supporting new component types and features as they're needed, while providing a consistent and maintainable codebase. 
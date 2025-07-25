"use client";
import React, { useState, useEffect } from "react";
import 'katex/dist/katex.min.css';
import katex from 'katex';
import PopupCard from './PopupCard';
import renderMath from './renderMath';

// --- Type Definitions ---
type Component = {
  component: string;
  props: Record<string, any>;
};

type DbObject = {
  id: string;
  page: number;
  type: 'components' | 'image' | 'table';
  content: any; // Can be stringified JSON or an object
  bbox: number[];
  page_width: number;
  page_height: number;
  group_id?: string;
};

type PageData = {
  pageNumber: number;
  components: Component[];
  visionObjects: DbObject[];
  page_width: number;
  page_height: number;
};

// --- Component Rendering Logic ---

// Groups sentences into paragraphs for better text flow and handles all component types
function renderComponentsWithParagraphs(components: Component[], onComponentClick: (event: React.MouseEvent, content: string, type: string) => void): React.ReactElement[] {
  const result: React.ReactElement[] = [];
  let currentParagraph: Component[] = [];

  // Group images and tables by group_id for side-by-side rendering
  const groupedComponents: Component[] = [];
  const imageGroups: { [groupId: string]: Component[] } = {};
  const tableGroups: { [groupId: string]: Component[] } = {};

  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    
    if (component.component === 'Image') {
      const groupId = component.props.group_id || `single-${i}`;
      if (!imageGroups[groupId]) {
        imageGroups[groupId] = [];
      }
      imageGroups[groupId].push(component);
    } else if (component.component === 'Table') {
      const groupId = component.props.group_id || `single-${i}`;
      if (!tableGroups[groupId]) {
        tableGroups[groupId] = [];
      }
      tableGroups[groupId].push(component);
    } else {
      // For non-image/table components, add them directly
      groupedComponents.push(component);
    }
  }

  // Add grouped images and tables
  Object.values(imageGroups).forEach(group => {
    if (group.length === 1) {
      // Single image
      groupedComponents.push(group[0]);
    } else {
      // Multiple images in a group - create a group component
      groupedComponents.push({
        component: 'ImageGroup',
        props: { images: group }
      });
    }
  });

  Object.values(tableGroups).forEach(group => {
    if (group.length === 1) {
      // Single table
      groupedComponents.push(group[0]);
    } else {
      // Multiple tables in a group - create a group component
      groupedComponents.push({
        component: 'TableGroup',
        props: { tables: group }
      });
    }
  });

  // Sort components by their original order (approximate)
  groupedComponents.sort((a, b) => {
    const aIndex = components.findIndex(c => c === a);
    const bIndex = components.findIndex(c => c === b);
    return aIndex - bIndex;
  });

  // Now render the grouped components
  for (let i = 0; i < groupedComponents.length; i++) {
    const component = groupedComponents[i];
    
    // Handle different component types
    if (component.component === 'Text' && component.props.style === 'sentence') {
      // Group sentences into paragraphs
      currentParagraph.push(component);
    } else if (component.component === 'Image' || component.component === 'Table' || component.component === 'ImageGroup' || component.component === 'TableGroup') {
      // Flush current paragraph before rendering image/table
      if (currentParagraph.length > 0) {
        result.push(
          <p key={`paragraph-${i}`} className="text-component">
            {currentParagraph.map((sentence, index) => (
              <React.Fragment key={`sentence-${i}-${index}`}>
                {renderComponentJSX(sentence, onComponentClick)}
                {index < currentParagraph.length - 1 && ' '}
              </React.Fragment>
            ))}
          </p>
        );
        currentParagraph = [];
      }
      
      // Render image, table, or group
      if (component.component === 'Image') {
        result.push(
          <div key={`image-${i}`} style={{ margin: '1.5rem 0', display: 'flex', justifyContent: 'center' }}>
            <img
              src={component.props.src || ''}
              alt={component.props.alt || 'PDF Figure'}
              className="clickable-sentence image-content"
              style={{ maxWidth: '60%', height: 'auto', display: 'block', margin: '0 auto' }}
              onClick={e => onComponentClick(e, component.props.alt || 'Image', 'Image')}
            />
          </div>
        );
      } else if (component.component === 'Table') {
        result.push(
          <div key={`table-${i}`} style={{ margin: '1.5rem 0', display: 'flex', justifyContent: 'center' }}>
            <img
              src={component.props.src || ''}
              alt={component.props.alt || 'PDF Table'}
              className="clickable-sentence table-content"
              style={{ maxWidth: '80%', height: 'auto', display: 'block', margin: '0 auto' }}
              onClick={e => onComponentClick(e, component.props.alt || 'Table', 'Table')}
            />
          </div>
        );
      } else if (component.component === 'ImageGroup') {
        result.push(
          <div key={`image-group-${i}`} style={{ margin: '1.5rem 0', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            {component.props.images.map((img: Component, imgIndex: number) => (
              <img
                key={`grouped-image-${imgIndex}`}
                src={img.props.src || ''}
                alt={img.props.alt || 'PDF Figure'}
                className="clickable-sentence image-content"
                style={{ maxWidth: '32%', height: 'auto', display: 'block' }}
                onClick={e => onComponentClick(e, img.props.alt || 'Image', 'Image')}
              />
            ))}
          </div>
        );
      } else if (component.component === 'TableGroup') {
        result.push(
          <div key={`table-group-${i}`} style={{ margin: '1.5rem 0', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            {component.props.tables.map((table: Component, tableIndex: number) => (
              <img
                key={`grouped-table-${tableIndex}`}
                src={table.props.src || ''}
                alt={table.props.alt || 'PDF Table'}
                className="clickable-sentence table-content"
                style={{ maxWidth: '45%', height: 'auto', display: 'block' }}
                onClick={e => onComponentClick(e, table.props.alt || 'Table', 'Table')}
              />
            ))}
          </div>
        );
      }
    } else {
      // Flush current paragraph before rendering other components
      if (currentParagraph.length > 0) {
        result.push(
          <p key={`paragraph-${i}`} className="text-component">
            {currentParagraph.map((sentence, index) => (
              <React.Fragment key={`sentence-${i}-${index}`}>
                {renderComponentJSX(sentence, onComponentClick)}
                {index < currentParagraph.length - 1 && ' '}
              </React.Fragment>
            ))}
          </p>
        );
        currentParagraph = [];
      }
      
      // Render other components (Heading, FigureTitle, FigureCaption, etc.)
      result.push(<div key={`component-${i}`}>{renderComponentJSX(component, onComponentClick)}</div>);
    }
  }
  
  // Flush any remaining paragraph
  if (currentParagraph.length > 0) {
    result.push(
      <p key="paragraph-final" className="text-component">
        {currentParagraph.map((sentence, index) => (
          <React.Fragment key={`sentence-final-${index}`}>
            {renderComponentJSX(sentence, onComponentClick)}
            {index < currentParagraph.length - 1 && ' '}
          </React.Fragment>
        ))}
      </p>
    );
  }
  
  return result;
}

// Renders a single component to JSX
function renderComponentJSX(component: Component, onComponentClick: (event: React.MouseEvent, content: string, type: string) => void): React.ReactElement {
  const { component: type, props } = component;
  
  // This function now primarily handles text-based components
  switch (type) {
    case 'Title':
      return (
        <div key={`title-${props.text}`} className="title-component" style={{
          textAlign: 'center',
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginTop: '3rem',
          marginBottom: '3rem',
          lineHeight: '1.1',
          color: '#000'
        }}>
          <span 
            className="clickable-sentence"
            onClick={(e) => onComponentClick(e, props.text, 'Title')}
          >
            {props.text}
          </span>
        </div>
      );
    case 'Abstract':
        return (
          <div key={`abstract-${props.title}`} className="abstract-component" style={{
            textAlign: 'center',
            marginTop: '2rem',
            marginBottom: '-1rem'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              {props.title}
            </h2>
            <div style={{
              textAlign: 'center',
              fontSize: '1rem',
              lineHeight: '1.5',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              <span 
                className="clickable-sentence"
                onClick={(e) => onComponentClick(e, props.content, 'Abstract')}
                dangerouslySetInnerHTML={renderMath(props.content)}
              />
            </div>
          </div>
        );
    case 'Heading':
      // Check if the text already starts with the section number to avoid duplication
      const sectionNumber = props.sectionNumber;
      const headingText = props.text;
      let displayText = headingText;
      
      // If we have a section number and the text starts with it, remove it from the text
      if (sectionNumber && headingText.startsWith(sectionNumber)) {
        displayText = headingText.substring(sectionNumber.length).trim();
      }
      
      // Determine the correct heading level based on section numbering
      let headingLevel = props.level || 2;
      
      // Override the level based on section number pattern
      if (sectionNumber) {
        const parts = sectionNumber.split('.');
        if (parts.length === 1) {
          // Single number like "1", "2", "3" - these are major sections (h2)
          headingLevel = 2;
        } else if (parts.length === 2) {
          // Double number like "3.1", "3.2" - these are subsections (h3)
          headingLevel = 3;
        } else if (parts.length === 3) {
          // Triple number like "3.1.1" - these are sub-subsections (h4)
          headingLevel = 4;
        } else if (parts.length >= 4) {
          // Deeper nesting - use h5 or h6
          headingLevel = Math.min(parts.length + 1, 6);
        }
      }
      
      return (
        <div key={`heading-${props.text}`} className="heading-component" style={{ marginTop: '2rem', marginBottom: '1rem' }}>
          {React.createElement(`h${headingLevel}`, {
            style: {
              fontSize: headingLevel === 1 ? '1.5rem' : 
                       headingLevel === 2 ? '1.3rem' : 
                       headingLevel === 3 ? '1.1rem' : 
                       headingLevel === 4 ? '1rem' : 
                       headingLevel === 5 ? '0.9rem' : '0.85rem',
              fontWeight: 'bold',
              margin: 0
            }
          }, 
            <>
              {sectionNumber && <span className="section-number">{sectionNumber}</span>}
              {displayText}
            </>
          )}
        </div>
      );
    case 'AuthorBlock':
      // Parse the author block into individual authors
      const authorLines = props.text.split('\n');
      const authors = [];
      let currentAuthor = [];
      
      for (const line of authorLines) {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          // Check if this line looks like an email (contains @)
          if (trimmedLine.includes('@')) {
            // This is an email, so it's the end of an author block
            currentAuthor.push(trimmedLine);
            if (currentAuthor.length > 0) {
              authors.push([...currentAuthor]);
            }
            currentAuthor = [];
          } else {
            // This is a name or affiliation
            currentAuthor.push(trimmedLine);
          }
        }
      }
      
      // Add any remaining author
      if (currentAuthor.length > 0) {
        authors.push(currentAuthor);
      }
      
      // Group authors into rows of 3
      const authorRows = [];
      const authorsPerRow = 3;
      
      for (let i = 0; i < authors.length; i += authorsPerRow) {
        authorRows.push(authors.slice(i, i + authorsPerRow));
      }
      
      return (
        <div key={`author-block-${props.text}`} className="author-block-component">
          <div 
            style={{ 
              marginBottom: '1rem',
              color: '#666',
              lineHeight: '1.4'
            }}
          >
            {authorRows.map((row, rowIndex) => (
              <div key={rowIndex} style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1.5rem',
                marginBottom: rowIndex < authorRows.length - 1 ? '1rem' : '0',
                flexWrap: 'wrap',
                maxWidth: '100%'
              }}>
                {row.map((author, authorIndex) => (
                  <div key={authorIndex} style={{
                    textAlign: 'center',
                    padding: '0.5rem',
                    width: '180px',
                    minWidth: '160px',
                    maxWidth: '200px',
                    flexShrink: 0
                  }}>
                    {author.map((line, lineIndex) => (
                      <div key={lineIndex} style={{
                        marginBottom: lineIndex === 0 ? '0.25rem' : '0.125rem',
                        fontWeight: lineIndex === 0 ? '600' : '400',
                        fontSize: lineIndex === 0 ? '0.9rem' : '0.8rem',
                        color: lineIndex === 0 ? '#374151' : '#6b7280'
                      }}>
                        {line}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    case 'Footer':
        return (
          <div key={`footer-${props.text}`} className="footer-component" style={{
            fontSize: '0.9rem',
            color: '#666',
            fontStyle: 'normal',
            fontWeight: 'normal',
            marginTop: '1rem',
            marginBottom: '1rem',
            lineHeight: '1.4'
          }}>
            <span 
              className="clickable-sentence"
              onClick={(e) => onComponentClick(e, props.text, 'Footer')}
              dangerouslySetInnerHTML={renderMath(props.text)}
            />
          </div>
        );
    case 'Text':
        return (
          <span 
            className="clickable-sentence text-component"
            onClick={(e) => onComponentClick(e, props.text, 'Text')}
            dangerouslySetInnerHTML={renderMath(props.text)}
          />
        );
    case 'FigureTitle':
        return (
          <div key={`figure-title-${props.text}`} className="figure-title-component">
            <strong>{props.text}</strong>
          </div>
        );
    case 'FigureCaption':
        return (
          <div key={`figure-caption-${props.text}`} className="figure-caption-component">
            <em>{props.text}</em>
          </div>
        );
    case 'Equation':
        const renderedMath = katex.renderToString(props.latex, { displayMode: props.display !== false, throwOnError: false });
        return props.display !== false ? (
          <div className="equation clickable-sentence equation-component" onClick={(e) => onComponentClick(e, props.latex, 'Equation')}>
            <span className="equation-content" dangerouslySetInnerHTML={{ __html: renderedMath }} />
            {props.number && <span className="equation-number">{props.number}</span>}
          </div>
        ) : (
          <span className="clickable-sentence inline-equation" onClick={(e) => onComponentClick(e, props.latex, 'Equation')} dangerouslySetInnerHTML={{ __html: renderedMath }} />
        );
    case 'List':
      const ListTag = props.ordered ? 'ol' : 'ul';
      return (
        <ListTag className="list-component">
          {(props.items || []).map((item: string, index: number) => (
            <li key={index}><span className="clickable-sentence" onClick={(e) => onComponentClick(e, item, 'List')}>{item}</span></li>
          ))}
        </ListTag>
      );
    // Other text-based components like Blockquote, Code can be added here
    default:
      return <></>; // Return empty for components handled by visionObjects
  }
}

// --- Main Viewer Component ---
export default function ComponentPDFViewer({
  objects,
  fileName,
}: {
  objects: DbObject[];
  fileName: string;
}) {
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number; side: 'left' | 'right' } | null>(null);
  const [popupContent, setPopupContent] = useState<string>('');
  const [popupImageUrl, setPopupImageUrl] = useState<string | undefined>(undefined);

  // 1. Group all database objects by page
  const pagesData = objects.reduce((acc, obj) => {
    const pageNum = obj.page;
    if (!acc[pageNum]) {
      acc[pageNum] = { pageNumber: pageNum, components: [], visionObjects: [], page_width: obj.page_width, page_height: obj.page_height };
    }
    
    if (obj.type === 'components') {
      // The content of 'components' type is an object { components: [...] }
      const content = (typeof obj.content === 'string') ? JSON.parse(obj.content) : obj.content;
      acc[pageNum].components.push(...(content.components || []));
    } else {
      // Other types like 'image', 'table' are vision objects
      acc[pageNum].visionObjects.push(obj);
    }
    return acc;
  }, {} as Record<number, PageData>);

  // 2. Convert the grouped data into a sorted array of pages
  const pages: PageData[] = Object.values(pagesData).sort((a, b) => a.pageNumber - b.pageNumber);
  
  // Standard US Letter: 8.5 x 11 inches at 96dpi = 816 x 1056 px
  const PAGE_WIDTH = 816;
  const PAGE_HEIGHT = 1056;
  const HORIZONTAL_MARGIN = 96; // 1 inch
  const VERTICAL_MARGIN = 72; // 0.75 inch

  

  const handleComponentClick = (event: React.MouseEvent, content: string, type: string) => {
    const target = (event.target as HTMLElement).closest('.clickable-sentence') as HTMLElement;
    if (!target) return;

    if (selectedElement) {
      selectedElement.classList.remove('selected-sentence');
    }
    target.classList.add('selected-sentence');
    setSelectedElement(target);

    const rect = target.getBoundingClientRect();
    const popupWidth = 600;
    const margin = 20;
    
    // Calculate available space on both sides
    const spaceOnRight = window.innerWidth - rect.right;
    const spaceOnLeft = rect.left;
    
    // Determine which side has more space
    const side: 'left' | 'right' = spaceOnRight >= popupWidth + margin ? 'right' : 'left';
    
    // Calculate x position
    let x: number;
    if (side === 'right') {
      x = rect.right + margin;
    } else {
      x = rect.left - popupWidth - margin;
    }
    
    // Ensure popup stays within viewport bounds
    x = Math.max(margin, Math.min(x, window.innerWidth - popupWidth - margin));
    
    // Calculate y position - center vertically relative to the clicked element
    const popupHeight = 600; // Updated height to match the card
    let y = rect.top + (rect.height / 2) - (popupHeight / 2);
    
    // Ensure popup stays within viewport vertically
    y = Math.max(margin, Math.min(y, window.innerHeight - popupHeight - margin));
    
    setPopupPosition({ x, y, side });
    setPopupContent(content);
    // If the clicked element is an image or table, set the imageUrl
    if ((type === 'Image' || type === 'Table') && target instanceof HTMLImageElement) {
      setPopupImageUrl(target.src);
    } else {
      setPopupImageUrl(undefined);
    }
  };

  const handleOutsideClick = (event: React.MouseEvent) => {
    if (popupPosition && !(event.target as HTMLElement).closest('.popup-card, .clickable-sentence')) {
      setPopupPosition(null);
      if (selectedElement) {
        selectedElement.classList.remove('selected-sentence');
        setSelectedElement(null);
      }
    }
  };

  // After hydration, show paginated content
  return (
    <>
      <style jsx>{`
        .clickable-sentence {
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          border-radius: 4px !important;
          padding: 2px 4px !important;
          margin: -2px -4px !important;
          display: inline !important;
          border: 1px solid transparent !important;
          position: relative !important;
          z-index: 1 !important;
        }
        .clickable-sentence:hover { background-color: #f3f4f6; border-color: #d1d5db; }
        .clickable-sentence.selected-sentence { background-color: #e5e7eb; border-color: #9ca3af; }
        .page-header { position: absolute; top: 20px; right: 20px; font-size: 0.8rem; color: #9ca3af; }
        .academic-paper { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; text-align: justify; hyphens: auto; color: black; overflow-wrap: break-word;}
        .figure-title-component { text-align: center; font-weight: bold; margin: 1rem 0 0.5rem 0; }
        .figure-caption-component { text-align: center; font-style: italic; margin: 0.5rem 0 1rem 0; color: #666; }
        
        /* Heading styles - target heading components directly */
        .heading-component h1 { font-size: 1.5rem; font-weight: bold; margin: 0; }
        .heading-component h2 { font-size: 1.3rem; font-weight: bold; margin: 0; }
        .heading-component h3 { font-size: 1.1rem; font-weight: bold; margin: 0; }
        .heading-component h4 { font-size: 1rem; font-weight: bold; margin: 0; }
        .heading-component h5 { font-size: 0.9rem; font-weight: bold; margin: 0; }
        .heading-component h6 { font-size: 0.85rem; font-weight: bold; margin: 0; }
        
        /* Also target headings within academic-paper for consistency */
        .academic-paper h1 { font-size: 1.5rem; font-weight: bold; margin: 1.5rem 0 1rem 0; }
        .academic-paper h2 { font-size: 1.3rem; font-weight: bold; margin: 1.5rem 0 1rem 0; }
        .academic-paper h3 { font-size: 1.1rem; font-weight: bold; margin: 1.5rem 0 1rem 0; }
        .academic-paper h4 { font-size: 1rem; font-weight: bold; margin: 1.5rem 0 1rem 0; }
        .academic-paper h5 { font-size: 0.9rem; font-weight: bold; margin: 1.5rem 0 1rem 0; }
        .academic-paper h6 { font-size: 0.85rem; font-weight: bold; margin: 1.5rem 0 1rem 0; }
        
        .section-number { font-weight: bold; margin-right: 0.5rem; }
      `}</style>
      <div className="w-full flex flex-col items-center py-12 bg-gray-100" onClick={handleOutsideClick}>
        {pages.map((page) => (
          <div
            key={`page-${page.pageNumber}`}
            className="relative bg-white shadow-lg border border-gray-300 mb-8 page-container"
            style={{
              width: PAGE_WIDTH,
              minHeight: PAGE_HEIGHT,
              boxSizing: 'border-box',
              marginBottom: '2rem',
              padding: `${VERTICAL_MARGIN}px ${HORIZONTAL_MARGIN}px`,
            }}
          >
            <div className="page-header">
              <div className="page-number">{page.pageNumber}</div>
            </div>
            <div className="academic-paper">
              {/* Render all components in order (text, images, tables, etc.) */}
              {renderComponentsWithParagraphs(page.components, handleComponentClick)}
            </div>
          </div>
        ))}
      </div>
      {/* Popup Card */}
      {popupPosition && (
        console.log('Rendering PopupCard with', { popupPosition, popupContent }),
        <PopupCard
          position={popupPosition}
          content={popupContent}
          onClose={() => {
            setPopupPosition(null);
            setPopupContent('');
            setPopupImageUrl(undefined);
            if (selectedElement) {
              selectedElement.classList.remove('selected-sentence');
              setSelectedElement(null);
            }
          }}
          type={selectedElement?.classList.contains('equation') ? 'Equation' : selectedElement?.classList.contains('image-content') ? 'Image' : selectedElement?.classList.contains('table-content') ? 'Table' : 'Text'}
          fileName={fileName}
          imageUrl={popupImageUrl}
        />
      )}
    </>
  );
}
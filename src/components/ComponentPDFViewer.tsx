"use client";
import React, { useState, useRef, useEffect } from "react";
import 'katex/dist/katex.min.css';
import katex from 'katex';
import PopupCard from './PopupCard';
import renderMath from './renderMath';

type Component = {
  component: string;
  props: Record<string, any>;
};

type FormattedObject = {
  id: string;
  page: number;
  type: string;
  content: {
    components?: Component[];
    content?: string;
  } | string;
  bbox: number[];
  page_width: number;
  page_height: number;
};

type VisionObject = {
  id: string;
  page: number;
  type: string;
  content: any;
  bbox: number[];
  page_width: number;
  page_height: number;
};

type Page = {
  components: Component[];
  pageNumber: number;
};

// Function to split components into pages
function splitComponentsIntoPages(components: Component[], maxHeight: number): Page[] {
  const pages: Page[] = [];
  let currentPage = 1;
  
  // Create a temporary div to measure content
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.visibility = 'hidden';
  tempDiv.style.width = '624px'; // PAGE_WIDTH - 2 * HORIZONTAL_MARGIN
  tempDiv.style.fontFamily = 'Times New Roman, Times, serif';
  tempDiv.style.fontSize = '11pt';
  tempDiv.style.lineHeight = '1.4';
  tempDiv.style.textAlign = 'justify';
  tempDiv.style.hyphens = 'auto';
  tempDiv.style.color = 'black';
  tempDiv.style.padding = '0';
  tempDiv.style.margin = '0';
  tempDiv.style.whiteSpace = 'pre-wrap';
  tempDiv.style.wordWrap = 'break-word';
  
  document.body.appendChild(tempDiv);
  
  let currentPageComponents: Component[] = [];
  let currentHeight = 0;
  
  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    const componentDiv = document.createElement('div');
    
    // Render the component to measure its height
    const renderedComponent = renderComponentHTML(component);
    componentDiv.innerHTML = renderedComponent;
    tempDiv.appendChild(componentDiv);
    
    const componentHeight = componentDiv.offsetHeight;
    tempDiv.removeChild(componentDiv);
    
    // Check if adding this component would exceed the page height
    if (currentHeight + componentHeight > maxHeight && currentPageComponents.length > 0) {
      // Start a new page
      pages.push({
        components: currentPageComponents,
        pageNumber: currentPage
      });
      currentPage++;
      currentPageComponents = [];
      currentHeight = 0;
    }
    
    // Add the component to current page
    currentPageComponents.push(component);
    currentHeight += componentHeight;
  }
  
  // Add the last page if there are components
  if (currentPageComponents.length > 0) {
    pages.push({
      components: currentPageComponents,
      pageNumber: currentPage
    });
  }
  
  document.body.removeChild(tempDiv);
  
  // If no pages were created, create a single page
  if (pages.length === 0) {
    pages.push({
      components: components,
      pageNumber: 1
    });
  }
  
  return pages;
}

// Component renderer function for HTML (measurement mode)
function renderComponentHTML(component: Component): string {
  const { component: type, props } = component;
  
  switch (type) {
    case 'Heading':
      const level = props.level || 2;
      const text = props.text || '';
      const sectionNumber = props.sectionNumber || '';
      
      return `<h${level}>${sectionNumber ? `<span class="section-number">${sectionNumber}</span> ` : ''}${text}</h${level}>`;
      
    case 'Text':
      const textContent = props.text || '';
      const style = props.style || 'paragraph';
      
      return style === 'sentence' ? 
        `<span class="clickable-sentence">${textContent}</span>` : 
        `<p><span class="clickable-sentence">${textContent}</span></p>`;
        
    case 'Equation':
      const latex = props.latex || '';
      const number = props.number || '';
      const display = props.display !== false;
      
      if (display) {
        return `<div class="equation clickable-sentence">$${latex}$$${number ? ` <span class="equation-number">${number}</span>` : ''}</div>`;
      } else {
        return `<span class="clickable-sentence">$${latex}$</span>`;
      }
      
    case 'List':
      const items = props.items || [];
      const ordered = props.ordered || false;
      
      const tag = ordered ? 'ol' : 'ul';
      const listItems = items.map((item: string) => `<li><span class="clickable-sentence">${item}</span></li>`).join('');
      return `<${tag} class="list-component">${listItems}</${tag}>`;
      
    case 'Blockquote':
      const quoteText = props.text || '';
      const citation = props.citation || '';
      
      return `<blockquote class="clickable-sentence">${quoteText}${citation ? ` <cite>— ${citation}</cite>` : ''}</blockquote>`;
      
    case 'Code':
      const code = props.code || '';
      const inline = props.inline || false;
      
      return inline ? 
        `<code class="clickable-sentence">${code}</code>` : 
        `<pre><code class="clickable-sentence">${code}</code></pre>`;
        
    default:
      return `<div class="unknown-component">Unknown component: ${type}</div>`;
  }
}

// Function to group sentences into paragraphs for better layout
function renderComponentsWithParagraphs(components: Component[], onComponentClick: (event: React.MouseEvent, content: string, type: string) => void): React.ReactElement[] {
  const result: React.ReactElement[] = [];
  let currentParagraph: Component[] = [];
  
  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    
    if (component.component === 'Text' && component.props.style === 'sentence') {
      // Add sentence to current paragraph
      currentParagraph.push(component);
    } else {
      // Render current paragraph if it exists
      if (currentParagraph.length > 0) {
        result.push(
          <p key={`paragraph-${i}`} className="text-component">
            {currentParagraph.map((sentenceComponent, sentenceIndex) => (
              <React.Fragment key={`sentence-${i}-${sentenceIndex}`}>
                {renderComponentJSX(sentenceComponent, onComponentClick)}
                {sentenceIndex < currentParagraph.length - 1 && ' '}
              </React.Fragment>
            ))}
          </p>
        );
        currentParagraph = [];
      }
      
      // Render the current non-sentence component
      result.push(
        <div key={`component-${i}`}>
          {renderComponentJSX(component, onComponentClick)}
        </div>
      );
    }
  }
  
  // Render any remaining sentences in the last paragraph
  if (currentParagraph.length > 0) {
    result.push(
      <p key={`paragraph-final`} className="text-component">
        {currentParagraph.map((sentenceComponent, sentenceIndex) => (
          <React.Fragment key={`sentence-final-${sentenceIndex}`}>
            {renderComponentJSX(sentenceComponent, onComponentClick)}
            {sentenceIndex < currentParagraph.length - 1 && ' '}
          </React.Fragment>
        ))}
      </p>
    );
  }
  
  return result;
}

// Component renderer function for React components
function renderComponentJSX(component: Component, onComponentClick: (event: React.MouseEvent, content: string, type: string) => void): React.ReactElement {
  const { component: type, props } = component;
  
  switch (type) {
    case 'Heading':
      const level = props.level || 2;
      const text = props.text || '';
      const sectionNumber = props.sectionNumber || '';
      
      return (
        <div key={`heading-${text}`} className="heading-component">
          {sectionNumber && <span className="section-number">{sectionNumber}</span>}
          {React.createElement(`h${level}`, {}, text)}
        </div>
      );
      
    case 'Text':
      const textContent = props.text || '';
      const style = props.style || 'paragraph';
      
      if (style === 'sentence') {
        return (
          <span 
            key={`text-${textContent.substring(0, 20)}`}
            className="clickable-sentence text-component"
            onClick={(e) => onComponentClick(e, textContent, 'Text')}
            dangerouslySetInnerHTML={renderMath(textContent)}
          />
        );
      } else {
        return (
          <p key={`paragraph-${textContent.substring(0, 20)}`} className="text-component">
            <span 
              className="clickable-sentence"
              onClick={(e) => onComponentClick(e, textContent, 'Text')}
              dangerouslySetInnerHTML={renderMath(textContent)}
            />
          </p>
        );
      }
      
    case 'Equation':
      const latex = props.latex || '';
      const number = props.number || '';
      const display = props.display !== false;
      // Use katex.renderToString directly for equations (old logic)
      let renderedMath: string;
      try {
        renderedMath = katex.renderToString(latex, { displayMode: display, throwOnError: false });
      } catch (e) {
        renderedMath = display ? `$$${latex}$$` : `$${latex}$`;
      }
      if (display) {
        return (
          <div
            key={`equation-${latex.substring(0, 20)}`}
            className="equation clickable-sentence equation-component"
            onClick={(e) => onComponentClick(e, latex, 'Equation')}
          >
            <span
              className="equation-content"
              dangerouslySetInnerHTML={{ __html: renderedMath }}
            />
            {number && <span className="equation-number">{number}</span>}
          </div>
        );
      } else {
        return (
          <span
            key={`inline-equation-${latex.substring(0, 20)}`}
            className="clickable-sentence inline-equation"
            onClick={(e) => onComponentClick(e, latex, 'Equation')}
            dangerouslySetInnerHTML={{ __html: renderedMath }}
          />
        );
      }
      
    case 'List':
      const items = props.items || [];
      const ordered = props.ordered || false;
      
      const ListTag = ordered ? 'ol' : 'ul';
      
      return (
        <ListTag key={`list-${items.length}`} className="list-component">
          {items.map((item: string, index: number) => (
            <li key={index}>
              <span 
                className="clickable-sentence"
                onClick={(e) => onComponentClick(e, item, 'List')}
              >
                {item}
              </span>
            </li>
          ))}
        </ListTag>
      );
      
    case 'Blockquote':
      const quoteText = props.text || '';
      const citation = props.citation || '';
      
      return (
        <blockquote 
          key={`blockquote-${quoteText.substring(0, 20)}`}
          className="clickable-sentence blockquote-component"
          onClick={(e) => onComponentClick(e, quoteText, 'Blockquote')}
        >
          {quoteText}
          {citation && <cite>— {citation}</cite>}
        </blockquote>
      );
      
    case 'Code':
      const code = props.code || '';
      const inline = props.inline || false;
      
      if (inline) {
        return (
          <code 
            key={`inline-code-${code.substring(0, 20)}`}
            className="clickable-sentence inline-code"
            onClick={(e) => onComponentClick(e, code, 'Code')}
          >
            {code}
          </code>
        );
      } else {
        return (
          <pre key={`code-block-${code.substring(0, 20)}`} className="code-block">
            <code 
              className="clickable-sentence"
              onClick={(e) => onComponentClick(e, code, 'Code')}
            >
              {code}
            </code>
          </pre>
        );
      }
      
    default:
      return (
        <div key={`unknown-${type}`} className="unknown-component">
          Unknown component: {type}
        </div>
      );
  }
}

export default function ComponentPDFViewer({
  objects,
  fileName,
}: {
  objects: (FormattedObject | VisionObject)[];
  fileName: string;
}) {
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number; side: 'left' | 'right' } | null>(null);
  const [popupContent, setPopupContent] = useState<string>('');

  // Separate component objects from vision objects
  const componentObjects = objects.filter(obj => obj.type === "components") as FormattedObject[];
  const visionObjects = objects.filter(obj => obj.type !== "components") as VisionObject[];

  const components = (componentObjects[0]?.content && typeof componentObjects[0].content === 'object' && 'components' in componentObjects[0].content) 
    ? (componentObjects[0].content as { components: Component[] }).components 
    : [];
  const pageNumber = componentObjects[0]?.page || 1;
  
  // Debug logging
  console.log('Component objects:', componentObjects);
  console.log('Components:', components);
  console.log('Components type:', typeof components);

  // Standard US Letter: 8.5 x 11 inches at 96dpi = 816 x 1056 px
  const PAGE_WIDTH = 816;
  const PAGE_HEIGHT = 1056;
  const HORIZONTAL_MARGIN = 96; // 1 inch
  const VERTICAL_MARGIN = 72; // 0.75 inch
  const CONTENT_HEIGHT = PAGE_HEIGHT - (2 * VERTICAL_MARGIN); // Available content height

  // Handle click events on clickable elements
  const handleComponentClick = (event: React.MouseEvent, content: string, type: string) => {
    console.log('Component click event triggered');
    const target = event.target as HTMLElement;
    console.log('Clicked target:', target);
    console.log('Target classes:', target.className);
    
    // Remove previous selection
    if (selectedElement) {
      selectedElement.classList.remove('selected-sentence');
    }
    
    // Add selection to current element
    target.classList.add('selected-sentence');
    setSelectedElement(target);
    
    // Calculate popup position
    const rect = target.getBoundingClientRect();
    const pageContainer = (event.currentTarget as HTMLElement).closest('.page-container')?.getBoundingClientRect();
    
    if (!pageContainer) return;
    
    // PDF page width is 816px (8.5 inches), popup should be ~480px (5 inches)
    const popupWidth = 480;
    const margin = 20; // Space between popup and element
    
    // Get the PDF page position in the viewport
    const pdfPageLeft = pageContainer.left;
    const pdfPageRight = pageContainer.right;
    
    // Determine if popup should appear on left or right side
    const spaceOnRight = window.innerWidth - rect.right;
    const spaceOnLeft = rect.left;
    let side: 'left' | 'right' = spaceOnRight >= popupWidth + margin ? 'right' : 'left';
    
    let x: number;
    if (side === 'right') {
      x = rect.right + margin;
    } else {
      x = Math.max(pdfPageLeft - popupWidth + 100, rect.left - popupWidth - margin);
    }
    
    // Ensure popup doesn't go off-screen
    x = Math.max(20, Math.min(x, window.innerWidth - popupWidth - 20));
    
    // If we had to adjust the position significantly, change the side
    if (x <= 100) {
      side = 'right';
    }
    
    const y = rect.top + (rect.height / 2) - 100;
    const yAdjusted = Math.max(20, Math.min(y, window.innerHeight - 200));
    
    setPopupPosition({ x, y: yAdjusted, side });
    setPopupContent(content);
    
    console.log('Setting popup position:', { x, y, side });
    console.log('Setting popup content:', content);
  };

  // Handle clicking outside popup to close it
  const handleOutsideClick = (event: React.MouseEvent) => {
    // Don't close if clicking on a clickable element
    if ((event.target as HTMLElement).closest('.clickable-sentence')) {
      return;
    }
    
    if (popupPosition && !(event.target as HTMLElement).closest('.popup-card')) {
      setPopupPosition(null);
      setPopupContent('');
      if (selectedElement) {
        selectedElement.classList.remove('selected-sentence');
        setSelectedElement(null);
      }
    }
  };

  // Effect to handle pagination on client side after hydration
  useEffect(() => {
    setIsClient(true);
    // Small delay to ensure hydration is complete
    const timer = setTimeout(() => {
      setIsHydrated(true);
      if (components.length > 0 && typeof window !== 'undefined') {
        const splitPages = splitComponentsIntoPages(components, CONTENT_HEIGHT);
        setPages(splitPages);
      } else if (components.length > 0) {
        // Fallback: if no pages were created, create a single page
        setPages([{
          components: components,
          pageNumber: 1
        }]);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [components, CONTENT_HEIGHT]);

  // Show initial content until hydration is complete
  if (!isHydrated) {
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

          .clickable-sentence:hover {
            background-color: #f3f4f6 !important;
            border-color: #d1d5db !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
            transform: translateY(-1px) !important;
          }

          .clickable-sentence.selected-sentence {
            background-color: #e5e7eb !important;
            border-color: #9ca3af !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15) !important;
          }

          .equation.clickable-sentence {
            display: block !important;
            padding: 6px 8px !important;
            margin: 2px -8px !important;
            border-radius: 6px !important;
            border: 1px solid transparent !important;
          }

          .equation.clickable-sentence:hover {
            background-color: #f3f4f6 !important;
            border-color: #d1d5db !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
          }

          .equation.clickable-sentence.selected-sentence {
            background-color: #e5e7eb !important;
            border-color: #9ca3af !important;
            box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15) !important;
          }

          blockquote.clickable-sentence {
            display: block !important;
            padding: 6px 8px !important;
            margin: 2px -8px !important;
            border-radius: 6px !important;
            border: 1px solid transparent !important;
          }

          blockquote.clickable-sentence:hover {
            background-color: #f3f4f6 !important;
            border-color: #d1d5db !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
          }

          blockquote.clickable-sentence.selected-sentence {
            background-color: #e5e7eb !important;
            border-color: #9ca3af !important;
            box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15) !important;
          }
        `}</style>
        <div className="w-full flex flex-col items-center py-12 bg-gray-100" onClick={handleOutsideClick}>
          <div
            className="relative bg-white shadow-lg border border-gray-300 page-container"
            style={{
              width: PAGE_WIDTH,
              minHeight: PAGE_HEIGHT,
              boxSizing: 'border-box',
            }}
          >
            <div className="page-header">
              <div className="page-number">{pageNumber}</div>
            </div>
            <div
              style={{
                padding: `${VERTICAL_MARGIN}px ${HORIZONTAL_MARGIN}px`,
              }}
            >
              <div className="academic-paper">
                {renderComponentsWithParagraphs(components, handleComponentClick)}
              </div>
            </div>
          </div>
          {isClient && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Processing pagination...
            </div>
          )}
        </div>
        
        {/* Popup Card */}
        {popupPosition && (
          <PopupCard
            position={popupPosition}
            content={popupContent}
            onClose={() => {
              setPopupPosition(null);
              setPopupContent('');
              if (selectedElement) {
                selectedElement.classList.remove('selected-sentence');
                setSelectedElement(null);
              }
            }}
            type={selectedElement?.classList.contains('equation') ? 'Equation' : 'Text'}
            fileName={fileName}
          />
        )}
      </>
    );
  }

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

        .clickable-sentence:hover {
          background-color: #f3f4f6 !important;
          border-color: #d1d5db !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
          transform: translateY(-1px) !important;
        }

        .clickable-sentence.selected-sentence {
          background-color: #e5e7eb !important;
          border-color: #9ca3af !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15) !important;
        }

        .equation.clickable-sentence {
          display: block !important;
          padding: 6px 8px !important;
          margin: 2px -8px !important;
          border-radius: 6px !important;
          border: 1px solid transparent !important;
        }

        .equation.clickable-sentence:hover {
          background-color: #f3f4f6 !important;
          border-color: #d1d5db !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
        }

        .equation.clickable-sentence.selected-sentence {
          background-color: #e5e7eb !important;
          border-color: #9ca3af !important;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15) !important;
        }

        blockquote.clickable-sentence {
          display: block !important;
          padding: 6px 8px !important;
          margin: 2px -8px !important;
          border-radius: 6px !important;
          border: 1px solid transparent !important;
        }

        blockquote.clickable-sentence:hover {
          background-color: #f3f4f6 !important;
          border-color: #d1d5db !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
        }

        blockquote.clickable-sentence.selected-sentence {
          background-color: #e5e7eb !important;
          border-color: #9ca3af !important;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>
      <div className="w-full flex flex-col items-center py-12 bg-gray-100" onClick={handleOutsideClick}>
        {pages.map((page, index) => (
          <div
            key={index}
            className="relative bg-white shadow-lg border border-gray-300 mb-8 page-container"
            style={{
              width: PAGE_WIDTH,
              minHeight: PAGE_HEIGHT,
              boxSizing: 'border-box',
            }}
          >
            {/* Page Header for Page Number */}
            <div className="page-header">
              <div className="page-number">{page.pageNumber}</div>
            </div>

            {/* Main Content Area */}
            <div
              style={{
                padding: `${VERTICAL_MARGIN}px ${HORIZONTAL_MARGIN}px`,
              }}
            >
              {/* Render the components */}
              <div className="academic-paper">
                {renderComponentsWithParagraphs(page.components, handleComponentClick)}
              </div>
            </div>
          </div>
        ))}

        {/* ... (Keep the existing Vision objects rendering logic for images/tables) ... */}
      </div>
      
      {/* Popup Card */}
      {popupPosition && (
        <PopupCard
          position={popupPosition}
          content={popupContent}
          onClose={() => {
            setPopupPosition(null);
            setPopupContent('');
            if (selectedElement) {
              selectedElement.classList.remove('selected-sentence');
              setSelectedElement(null);
            }
          }}
          type={selectedElement?.classList.contains('equation') ? 'Equation' : 'Text'}
          fileName={fileName}
        />
      )}
    </>
  );
} 
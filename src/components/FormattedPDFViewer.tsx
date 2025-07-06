"use client";
import { useState, useRef, useEffect } from "react";
import 'katex/dist/katex.min.css';
import katex from 'katex';

type FormattedObject = {
  id: string;
  page: number;
  type: string;
  content: {
    content: string;
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
  content: string;
  pageNumber: number;
};

// Helper to render KaTeX math in HTML string
type Rendered = { __html: string };
function renderMath(html:string){
  // display: $$ … $$  OR  \[ … \]
  html = html
    .replace(/\$\$([\s\S]+?)\$\$/g,(_,m)=>katex.renderToString(m,{displayMode:true,throwOnError:false}))
    .replace(/\\\[([\s\S]+?)\\\]/g,(_,m)=>katex.renderToString(m,{displayMode:true,throwOnError:false}));

  // inline: $ … $  OR  \( … \)
  html = html
    .replace(/\$([^$]+?)\$/g,(_,m)=>katex.renderToString(m,{displayMode:false,throwOnError:false}))
    .replace(/\\\(([^\)]+?)\\\)/g,(_,m)=>katex.renderToString(m,{displayMode:false,throwOnError:false}));

  return {__html:html};
}

// Function to split content into pages
function splitContentIntoPages(content: string, maxHeight: number): Page[] {
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
  
  // Apply academic paper styles
  tempDiv.innerHTML = `
    <style>
      .academic-paper h1, .academic-paper h2, .academic-paper h3 {
        font-weight: 700;
        color: black;
        line-height: 1.2;
        text-align: left;
        margin: 0;
        padding: 0;
      }
      .academic-paper h2 {
        font-size: 1.125rem;
        margin-top: 1.5rem;
        margin-bottom: 0.75rem;
      }
      .academic-paper h3 {
        font-size: 1rem;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
      }
      .academic-paper p {
        margin: 0.5rem 0;
        text-indent: 1.5em;
      }
      .academic-paper h1 + p, .academic-paper h2 + p, .academic-paper h3 + p {
        text-indent: 0;
      }
      .academic-paper blockquote {
        margin: 1rem 0;
        padding-left: 1.5rem;
        font-size: 0.875rem;
        color: #4a5568;
        font-style: italic;
        border-left: 2px solid #ccc;
        text-indent: 0;
      }
      .equation {
        display: block;
        margin: 1em 0;
        page-break-inside: avoid;
      }
      .katex-display {
        margin: 0.75rem 0;
      }
    </style>
    <div class="academic-paper">${content}</div>
  `;
  
  document.body.appendChild(tempDiv);
  
  const contentDiv = tempDiv.querySelector('.academic-paper') as HTMLElement;
  const children = Array.from(contentDiv.children);
  
  let currentPageContent = '';
  let currentHeight = 0;
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement;
    const childClone = child.cloneNode(true) as HTMLElement;
    
    // Create a test div to measure this element's height
    const testDiv = document.createElement('div');
    testDiv.appendChild(childClone);
    tempDiv.appendChild(testDiv);
    
    const childHeight = testDiv.offsetHeight;
    tempDiv.removeChild(testDiv);
    
    // Special handling for headings - try to keep them with their content
    const isHeading = child.tagName.match(/^H[1-6]$/);
    const nextChild = children[i + 1] as HTMLElement;
    const nextIsHeading = nextChild && nextChild.tagName.match(/^H[1-6]$/);
    
    // If this is a heading and we're near the page limit, check if we should start a new page
    if (isHeading && currentHeight > maxHeight * 0.8 && currentPageContent.trim()) {
      // Start a new page for the heading
      pages.push({
        content: currentPageContent,
        pageNumber: currentPage
      });
      currentPage++;
      currentPageContent = '';
      currentHeight = 0;
    }
    
    // Check if adding this element would exceed the page height
    if (currentHeight + childHeight > maxHeight && currentPageContent.trim()) {
      // Don't break in the middle of a heading and its content
      if (isHeading && !nextIsHeading) {
        // If this is a heading and there's content after it, start a new page
        pages.push({
          content: currentPageContent,
          pageNumber: currentPage
        });
        currentPage++;
        currentPageContent = '';
        currentHeight = 0;
      } else if (!isHeading) {
        // For non-heading elements, start a new page
        pages.push({
          content: currentPageContent,
          pageNumber: currentPage
        });
        currentPage++;
        currentPageContent = '';
        currentHeight = 0;
      }
    }
    
    // Add the element to current page
    currentPageContent += child.outerHTML;
    currentHeight += childHeight;
  }
  
  // Add the last page if there's content
  if (currentPageContent.trim()) {
    pages.push({
      content: currentPageContent,
      pageNumber: currentPage
    });
  }
  
  document.body.removeChild(tempDiv);
  
  // If no pages were created (content was empty or too short), create a single page
  if (pages.length === 0) {
    pages.push({
      content: content,
      pageNumber: 1
    });
  }
  
  return pages;
}

export default function FormattedPDFViewer({
  objects,
}: {
  objects: (FormattedObject | VisionObject)[];
}) {
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);

  // Separate formatted content from vision objects
  const formattedObjects = objects.filter(obj => obj.type === "formatted") as FormattedObject[];
  const visionObjects = objects.filter(obj => obj.type !== "formatted") as VisionObject[];

  const formattedContent = typeof formattedObjects[0]?.content === 'string' 
    ? formattedObjects[0].content 
    : formattedObjects[0]?.content?.content || "";
  const pageNumber = formattedObjects[0]?.page || 1; // Get page number
  
  // Debug logging
  console.log('Formatted objects:', formattedObjects);
  console.log('Formatted content:', formattedContent);
  console.log('Content type:', typeof formattedContent);

  // Standard US Letter: 8.5 x 11 inches at 96dpi = 816 x 1056 px
  const PAGE_WIDTH = 816;
  const PAGE_HEIGHT = 1056;
  const HORIZONTAL_MARGIN = 96; // 1 inch
  const VERTICAL_MARGIN = 72; // 0.75 inch
  const CONTENT_HEIGHT = PAGE_HEIGHT - (2 * VERTICAL_MARGIN); // Available content height

  // Handle click events on clickable elements
  const handleClick = (event: React.MouseEvent) => {
    console.log('Click event triggered');
    const target = event.target as HTMLElement;
    console.log('Clicked target:', target);
    console.log('Target classes:', target.className);
    
    // Check if the clicked element or its parent has the clickable-sentence class
    const clickableElement = target.closest('.clickable-sentence') as HTMLElement;
    console.log('Found clickable element:', clickableElement);
    
    if (clickableElement) {
      console.log('Clickable element found, text:', clickableElement.textContent?.trim());
      
      // Remove previous selection
      if (selectedElement) {
        selectedElement.classList.remove('selected-sentence');
      }
      
      // Add selection to current element
      clickableElement.classList.add('selected-sentence');
      setSelectedElement(clickableElement);
      
      // Log the clicked content
      console.log('Clicked element:', clickableElement.textContent?.trim());
      
      // You can add more functionality here, such as:
      // - Opening a tooltip with additional information
      // - Highlighting related content
      // - Triggering an API call
      // - Copying to clipboard
    } else {
      console.log('No clickable element found');
    }
  };

  // Effect to handle pagination on client side after hydration
  useEffect(() => {
    setIsClient(true);
    // Small delay to ensure hydration is complete
    const timer = setTimeout(() => {
      setIsHydrated(true);
      if (formattedContent && typeof window !== 'undefined') {
        const splitPages = splitContentIntoPages(formattedContent, CONTENT_HEIGHT);
        setPages(splitPages);
      } else if (formattedContent) {
        // Fallback: if no pages were created, create a single page
        setPages([{
          content: formattedContent,
          pageNumber: 1
        }]);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [formattedContent, CONTENT_HEIGHT]);

  // Show initial content until hydration is complete
  if (!isHydrated) {
    return (
      <div className="w-full flex flex-col items-center py-12 bg-gray-100">
        <div
          className="relative bg-white shadow-lg border border-gray-300"
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
            onClick={handleClick}
          >
            <div
              className="academic-paper"
              dangerouslySetInnerHTML={renderMath(formattedContent as string)}
            />
          </div>
        </div>
        {isClient && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Processing pagination...
          </div>
        )}
      </div>
    );
  }

  // After hydration, show paginated content
  return (
    <div className="w-full flex flex-col items-center py-12 bg-gray-100">
      {pages.map((page, index) => (
        <div
          key={index}
          className="relative bg-white shadow-lg border border-gray-300 mb-8"
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
            onClick={handleClick}
          >
            {/* Render the LLM's academic-paper HTML */}
            <div
              className="academic-paper"
              dangerouslySetInnerHTML={renderMath(page.content)}
            />
          </div>
        </div>
      ))}

      {/* ... (Keep the existing Vision objects rendering logic for images/tables) ... */}
    </div>
  );
}
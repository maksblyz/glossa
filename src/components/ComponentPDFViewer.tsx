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

// Groups sentences into paragraphs for better text flow
function renderComponentsWithParagraphs(components: Component[], onComponentClick: (event: React.MouseEvent, content: string, type: string) => void): React.ReactElement[] {
  const result: React.ReactElement[] = [];
  let currentParagraph: Component[] = [];
  
  // Filter out image/table components that will be rendered from visionObjects
  const textBasedComponents = components.filter(c => !['Image', 'ImageRow', 'Table', 'TableCaption'].includes(c.component));

  for (let i = 0; i < textBasedComponents.length; i++) {
    const component = textBasedComponents[i];
    
    if (component.component === 'Text' && component.props.style === 'sentence') {
      currentParagraph.push(component);
    } else {
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
      result.push(<div key={`component-${i}`}>{renderComponentJSX(component, onComponentClick)}</div>);
    }
  }
  
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
    case 'Heading':
      return (
        <div key={`heading-${props.text}`} className="heading-component">
          {props.sectionNumber && <span className="section-number">{props.sectionNumber}</span>}
          {React.createElement(`h${props.level || 2}`, {}, props.text)}
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
    const popupWidth = 480;
    const margin = 20;
    const spaceOnRight = window.innerWidth - rect.right;
    const side: 'left' | 'right' = spaceOnRight >= popupWidth + margin ? 'right' : 'left';
    const x = side === 'right' ? rect.right + margin : rect.left - popupWidth - margin;
    const y = rect.top;
    
    setPopupPosition({ x: Math.max(20, x), y: Math.max(20, y), side });
    setPopupContent(content);
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
              {/* Render text components */}
              {renderComponentsWithParagraphs(page.components, handleComponentClick)}
              {/* Render vision objects as blocks, in order */}
              {/* Group images by group_id for this page */}
              {(() => {
                const imageGroups = Object.values(
                  page.visionObjects
                    .filter(obj => obj.type === 'image')
                    .reduce((acc, img) => {
                      const group = img.group_id || img.content?.group_id || img.id;
                      if (!acc[group]) acc[group] = [];
                      acc[group].push(img);
                      return acc;
                    }, {} as Record<string, DbObject[]>)
                );
                return imageGroups.map((group, idx) => (
                  group.length === 1 ? (
                    <div key={group[0].id} style={{ margin: '1.5rem 0', display: 'flex', justifyContent: 'center' }}>
                      <img
                        src={group[0].content?.cdn_url || ''}
                        alt={group[0].content?.alt || 'PDF Figure'}
                        className="clickable-sentence image-content"
                        style={{ maxWidth: '60%', height: 'auto', display: 'block', margin: '0 auto' }}
                        onClick={e => handleComponentClick(e, group[0].content?.alt || 'Image', 'Image')}
                      />
                    </div>
                  ) : (
                    <div key={group.map(img => img.id).join('-')} style={{ margin: '1.5rem 0', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                      {group.map(img => (
                        <img
                          key={img.id}
                          src={img.content?.cdn_url || ''}
                          alt={img.content?.alt || 'PDF Figure'}
                          className="clickable-sentence image-content"
                          style={{ maxWidth: '30%', height: 'auto', display: 'block' }}
                          onClick={e => handleComponentClick(e, img.content?.alt || 'Image', 'Image')}
                        />
                      ))}
                    </div>
                  )
                ));
              })()}
              
              {/* Render tables as images */}
              {(() => {
                const tableGroups = Object.values(
                  page.visionObjects
                    .filter(obj => obj.type === 'table')
                    .reduce((acc, table) => {
                      const group = table.group_id || table.content?.group_id || table.id;
                      if (!acc[group]) acc[group] = [];
                      acc[group].push(table);
                      return acc;
                    }, {} as Record<string, DbObject[]>)
                );
                return tableGroups.map((group, idx) => (
                  group.length === 1 ? (
                    <div key={group[0].id} style={{ margin: '1.5rem 0', display: 'flex', justifyContent: 'center' }}>
                      <img
                        src={group[0].content?.cdn_url || ''}
                        alt={group[0].content?.alt || 'PDF Table'}
                        className="clickable-sentence table-content"
                        style={{ maxWidth: '80%', height: 'auto', display: 'block', margin: '0 auto' }}
                        onClick={e => handleComponentClick(e, group[0].content?.alt || 'Table', 'Table')}
                      />
                    </div>
                  ) : (
                    <div key={group.map(table => table.id).join('-')} style={{ margin: '1.5rem 0', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                      {group.map(table => (
                        <img
                          key={table.id}
                          src={table.content?.cdn_url || ''}
                          alt={table.content?.alt || 'PDF Table'}
                          className="clickable-sentence table-content"
                          style={{ maxWidth: '40%', height: 'auto', display: 'block' }}
                          onClick={e => handleComponentClick(e, table.content?.alt || 'Table', 'Table')}
                        />
                      ))}
                    </div>
                  )
                ));
              })()}
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
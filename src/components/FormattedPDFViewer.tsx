"use client";
import { useState } from "react";
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

export default function FormattedPDFViewer({
  objects,
}: {
  objects: (FormattedObject | VisionObject)[];
}) {
  const [activeImage, setActiveImage] = useState<string | null>(null);

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

  return (
    <div className="w-full flex flex-col items-center py-12 bg-gray-100">
      {/* Academic paper "page" */}
      <div
        className="relative bg-white shadow-lg border border-gray-300"
        style={{
          width: PAGE_WIDTH,
          minHeight: PAGE_HEIGHT,
          boxSizing: 'border-box',
        }}
      >
        {/* Page Header for Page Number */}
        <div className="page-header">
          <div className="page-number">{pageNumber}</div>
        </div>

        {/* Main Content Area */}
        <div
          style={{
            padding: `${VERTICAL_MARGIN}px ${HORIZONTAL_MARGIN}px`,
          }}
        >
          {/* Render the LLM's academic-paper TSX/HTML */}
          <div
            className="academic-paper" // This class is now styled in globals.css
            dangerouslySetInnerHTML={renderMath(formattedContent as string)}
          />
        </div>
      </div>

      {/* ... (Keep the existing Vision objects rendering logic for images/tables) ... */}
    </div>
  );
}
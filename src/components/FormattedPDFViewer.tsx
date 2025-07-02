"use client";
import { useState } from "react";

type FormattedObject = {
  id: string;
  page: number;
  type: string;
  content: {
    content: string;
  };
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

export default function FormattedPDFViewer({
  objects,
}: { 
  objects: (FormattedObject | VisionObject)[];
}) {
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Separate formatted content from vision objects
  const formattedObjects = objects.filter(obj => obj.type === "formatted") as FormattedObject[];
  const visionObjects = objects.filter(obj => obj.type !== "formatted") as VisionObject[];

  // Get the formatted content
  const formattedContent = formattedObjects[0]?.content?.content || "";

  // Standard US Letter: 8.5 x 11 inches at 96dpi = 816 x 1056 px
  const PAGE_WIDTH = 816;
  const PAGE_HEIGHT = 1056;
  const MARGIN = 96; // 1 inch at 96dpi

  return (
    <div className="w-full flex flex-col items-center">
      {/* Academic paper "page" */}
      <div
        className="relative flex justify-center mb-12"
        style={{ width: PAGE_WIDTH }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl border border-neutral-200 mx-auto overflow-auto"
          style={{
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
            minHeight: PAGE_HEIGHT,
            maxHeight: PAGE_HEIGHT,
            boxSizing: 'border-box',
            padding: MARGIN,
            fontFamily: 'Georgia, Times, "Times New Roman", serif',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
          }}
        >
          {/* Render the LLM's academic-paper TSX/HTML as-is */}
          <div
            className="w-full h-full"
            style={{ fontFamily: 'inherit' }}
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          />
        </div>
      </div>

      {/* Vision objects (images and tables) - optional, can be rendered below the page if needed */}
      {visionObjects.length > 0 && (
        <div className="space-y-6 w-full max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Figures and Tables</h2>
          {visionObjects.map((obj) => (
            <div key={obj.id} className="bg-white rounded-lg shadow p-6 overflow-hidden">
              {obj.type === "image" && (
                <div className="text-center">
                  <img
                    src={obj.content.url || obj.content}
                    alt={obj.content.alt || "Figure"}
                    className="max-w-full h-auto mx-auto cursor-pointer hover:opacity-90 transition-opacity rounded-lg shadow-sm"
                    onClick={() => setActiveImage(obj.id)}
                  />
                  {obj.content.caption && (
                    <figcaption className="mt-3 text-sm text-gray-600 italic">
                      {obj.content.caption}
                    </figcaption>
                  )}
                </div>
              )}
              {obj.type === "table" && (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
                    <tbody>
                      {obj.content.rows?.map((row: any[], rowIndex: number) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          {row.map((cell: any, cellIndex: number) => (
                            <td 
                              key={cellIndex} 
                              className="border border-gray-300 px-4 py-3 text-sm"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {obj.content.caption && (
                    <figcaption className="mt-3 text-sm text-gray-600 italic">
                      {obj.content.caption}
                    </figcaption>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image modal */}
      {activeImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setActiveImage(null)}
        >
          <div className="max-w-4xl max-h-full p-4">
            <img
              src={visionObjects.find(obj => obj.id === activeImage)?.content.url || ""}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
} 
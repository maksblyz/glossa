"use client";
import { useState } from "react";
import PlainPage from "./PlainPage";

type Obj = {
  id: string;
  page: number;
  type: string;
  content: string;
  bbox: number[];
  page_width: number;
  page_height: number;
};

export default function PlainPDFViewer({
  objects,
  width = 650,          // tweak as needed
}: { objects: Obj[]; width?: number }) {
  const [active, setActive] = useState<string | null>(null);

  // group by page, keep original insertion order
  const pages = objects.reduce<Record<number, Obj[]>>((acc, o) => {
    (acc[o.page] ||= []).push(o);
    return acc;
  }, {});

  return (
    <>
      {Object.values(pages).map((items) => (
        <PlainPage key={items[0].page} width={width}>
          {items
            .filter((o) => o.type === "text")
            .map((o) => (
              <span
                key={o.id}
                onClick={() => setActive(o.id)}
                className={o.id === active ? "bg-yellow-200 cursor-pointer" : "cursor-pointer"}
              >
                {o.content + " "}
              </span>
            ))}
        </PlainPage>
      ))}
    </>
  );
}

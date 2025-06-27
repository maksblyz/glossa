"use client"

import { useState } from "react"
import type { CSSProperties } from "react"

type PdfObj = {
    page: number;
    type: string;
    content: any;
    bbox: number[];
    page_width: number;
    page_height: number;
}

interface Props{
    objects: PdfObj[];
    containerWidth: number
}

export default function PDFViewer({ objects, containerWidth }: Props ) {
    const [hoverId, setHoverId] = useState<number | null>(null);

    const pages = objects.reduce<Record<number, PdfObj[]>>((acc, o) => {
        (acc[o.page] ||= []).push(o);
        return acc;
    }, {})

    return (
        <div className="space-y-10">
            {Object.entries(pages).map(([pageNum, items]) => {
                const { page_width, page_height } = items[0];
                const scale = containerWidth / page_width;
                const containerHeight = page_height * scale;

                return (
                    <div
                        key={pageNum}
                        className="relative bordr rounded bg-white shadow"
                        style={{ width: containerWidth, height: containerHeight }}
                    >
                        {items.map((o, i) => {
                            const [x0, y0, x1, y1] = o.bbox;
                            const style: CSSProperties = {
                                position: "absolute",
                                left: x0 * scale,
                                top: y0 * scale,
                                width: (x1 - x0) * scale,
                                height: (y1 - y0) * scale,
                                cursor: "pointer",
                                background:
                                hoverId === i ? "rgba(96,165,250,0.25)" : "transaprent",
                            };
                            return (
                                <div
                                    key = {i}
                                    style= {style}
                                    onMouseEnter={() => setHoverId(i)}
                                    onMouseLeave={() => setHoverId(null)}
                                    title={o.type}
                                >
                                    {/* invisible overlay, render real pdf later*/}
                                    </div>
                            )
                        })}
                    </div>
                )
            })}
        </div>
    )
}
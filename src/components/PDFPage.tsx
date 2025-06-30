import React from "react";

export default function PDFPage({
  width,
  height,
  scale,
  children,
}: {
  width: number;
  height: number;
  scale: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative bg-white shadow border mx-auto"
      style={{
        width: width * scale,
        height: height * scale,
        marginBottom: 32,
      }}
    >
      {children}
    </div>
  );
}
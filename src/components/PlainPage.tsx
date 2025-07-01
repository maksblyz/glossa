export default function PlainPage({
    children,
    width,
  }: { children: React.ReactNode; width: number }) {
    return (
      <div
        className="bg-white shadow border rounded mx-auto mb-10 p-6 leading-relaxed whitespace-pre-wrap"
        style={{ width }}
      >
        {children}
      </div>
    );
  }
  
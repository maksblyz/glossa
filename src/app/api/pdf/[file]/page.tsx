import { Suspense } from "react";

async function fetchObjects(file: string) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/pdf/${file}`, {
        next: { revalidate: 0 },
    });
    return res.json();
}

export default async function PDFStub({ params }: { params:  { file: string } }) {
    const objects = await fetchObjects(params.file);

    return (
        <main className="p-4 space-y-6">
            <h1 className="text-xl font-bold break-all">{params.file}</h1>

            {objects.map((o: any, i: number) => (
                <div key={i} className="border rounded p-2">
                    <p className="text-xs text-zinc-500">
                        page {o.page} | {o.type}
                    </p>
                    {o.type === 'text' && <p>{o.content}</p>}
                    {o.type === 'image' && (
                        <img
                            src={`${process.env.NEXT_PUBLIC_SITE_URL}/api/image/${params.file}?xref=${o.xref}`}
                            alt="pdf img"
                            className="max-w-full"
                        />
                    )}
                    {o.type === 'table' && (
                        <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(o.content, null, 2)}</pre>
                    )}
                </div>
            ))}
        </main>
    );
}
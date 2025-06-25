import { headers } from 'next/headers'

async function fetchObjects(file: string) {
    const host = (await headers()).get('host')!;
    const proto = host.startsWith('localhost') ? 'http' : 'https';
    const timestamp = Date.now();
    const url = `${proto}://${host}/api/pdf/${encodeURIComponent(file)}?t=${timestamp}`;
    console.log('Fetching from URL:', url);
    const res = await fetch(url, { cache: 'no-store'});
    if(!res.ok) throw new Error('API fail');
    // const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/pdf/${file}`, {
    //     next: { revalidate: 0 },
    // });
    const data = await res.json();
    console.log('Fetched objects count:', data.length);
    return data;
}

export default async function PDFStub({ params }: { params:  { file: string } }) {
    console.log('Processing file:', params.file);
    const objects = await fetchObjects(params.file);
    console.log('Objects length:', objects.length);

    if (objects.length === 0) {
        return (
            <main className='grid place-items-center h-96'>
                <p className='text-zinc-500 animate-pulse'>
                    Processing PDF... refresh in a few seconds
                </p>
            </main>
        )
    }

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
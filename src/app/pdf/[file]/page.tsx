import { headers } from 'next/headers'
import PDFViewer from '@/components/PDFViewer'
import { PDFStub } from '@/components/PDFStub';

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

export default async function PDFPage({ params }: { params: { file: string } }) {
    const file = decodeURIComponent(params.file)
    const objects = await fetchObjects(file)
  
    if (objects.length === 0) return <PDFStub />
  
    return (
      <main className="p-8 space-y-6">
        <h1 className="text-xl font-bold break-all">{file}</h1>
        <PDFViewer objects={objects} containerWidth={800} />
      </main>
    )
}
import { headers } from 'next/headers'
import FormattedPDFViewer from "@/components/FormattedPDFViewer";
import ComponentPDFViewer from "@/components/ComponentPDFViewer";

async function fetchObjects(file: string) {
    const host = (await headers()).get('host')!;
    const proto = host.startsWith('localhost') ? 'http' : 'https';
    const timestamp = Date.now();
    const url = `${proto}://${host}/api/pdf/${encodeURIComponent(file)}?t=${timestamp}`;
    console.log('Fetching from URL:', url);
    
    try {
        const res = await fetch(url, { cache: 'no-store'});
        if(!res.ok) {
            throw new Error(`API failed with status: ${res.status}`);
        }
        const data = await res.json();
        console.log('Fetched objects count:', data.length);
        return data;
    } catch (error) {
        console.error('Error fetching objects:', error);
        throw error;
    }
}

export default async function PDFStub({ params }: { params:  { file: string } }) {
    console.log('Processing file:', params.file);
    // Decode the file parameter since it's URL encoded
    const decodedFile = decodeURIComponent(params.file);
    console.log('Decoded file:', decodedFile);
    
    try {
        const objects = await fetchObjects(decodedFile);
        console.log('Objects length:', objects.length);

        if (objects.length === 0) {
            return (
                <main className='grid place-items-center h-96 bg-neutral-100'>
                    <div className='text-center'>
                        <p className='text-zinc-500 animate-pulse mb-4'>
                            Processing PDF... refresh in a few seconds
                        </p>
                        <p className='text-sm text-zinc-400'>
                            If this persists, the PDF may be empty or corrupted
                        </p>
                    </div>
                </main>
            )
        }

        // Check if we have component-based data
        const hasComponents = objects.some((obj: any) => obj.type === 'components');
        
        if (hasComponents) {
            // Use the new component-based viewer
            return (
                <main className="min-h-screen bg-neutral-100 flex flex-col items-center py-12">
                    <ComponentPDFViewer objects={objects} fileName={decodedFile} />
                </main>
            );
        } else {
            // Fallback to the old formatted viewer for backward compatibility
            return (
                <main className="min-h-screen bg-neutral-100 flex flex-col items-center py-12">
                    <FormattedPDFViewer objects={objects} fileName={decodedFile} />
                </main>
            );
        }
    } catch (error) {
        console.error('Error in PDF page:', error);
        return (
            <main className='grid place-items-center h-96 bg-neutral-100'>
                <div className='text-center'>
                    <p className='text-red-500 mb-4'>
                        Error loading PDF: {error instanceof Error ? error.message : 'Unknown error'}
                    </p>
                    <p className='text-sm text-zinc-400'>
                        Please try refreshing the page or contact support if the problem persists
                    </p>
                </div>
            </main>
        )
    }
}
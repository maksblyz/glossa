import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    const body = (await req.json()) as HandleUploadBody;

    return handleUpload({
        request: req,
        body,

        //issue token
        onBeforeGenerateToken: async () => ({
            allowedContentTypes: ['application/pdf'],
            addRandomSuffix:true,
            tokenPayload: JSON.stringify({})
        }),

        //called once browser PUTS file
        onUploadCompleted: async ({ blob }) => {
            console.log('new blob:', blob.url);
        },
    }).then(json => NextResponse.json(json));
}
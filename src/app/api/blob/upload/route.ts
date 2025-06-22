import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

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
            await redis.lpush('pdf_jobs', JSON.stringify({url: blob.url, name: blob.pathname}))
        },
    }).then(json => NextResponse.json(json));
}
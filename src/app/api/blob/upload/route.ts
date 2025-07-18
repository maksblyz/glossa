import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { db } from '@/db';

const redis = Redis.fromEnv();

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as HandleUploadBody;
        console.log('Upload request body:', body);

        return handleUpload({
            request: req,
            body,

            //issue token
            onBeforeGenerateToken: async () => {
                console.log('Generating token...');
                return {
                    allowedContentTypes: ['application/pdf'],
                    addRandomSuffix: true,
                    tokenPayload: JSON.stringify({})
                };
            },

            //called once browser PUTS file
            onUploadCompleted: async ({ blob }) => {
                try {
                    console.log('Upload completed for blob:', blob.pathname);
                    console.log('Blob URL:', blob.url);
                    
                    // Get the current user from the request headers
                    const authHeader = req.headers.get('authorization');
                    console.log('Auth header:', authHeader);
                    
                    let userId = null;
                    if (authHeader) {
                        try {
                            const { getUser } = getKindeServerSession();
                            const user = await getUser();
                            console.log('User found:', !!user);
                            console.log('User ID:', user?.id);
                            userId = user?.id || null;
                        } catch (authError) {
                            console.error('Auth error:', authError);
                        }
                    }
                    
                    // Create file record
                    const fileRecord = await db.file.create({
                        data: {
                            name: blob.pathname || 'Untitled PDF',
                            url: blob.url,
                            key: blob.pathname || '',
                            userId: userId,
                            uploadStatus: 'PENDING'
                        }
                    });
                    console.log('File saved to database with ID:', fileRecord.id);
                    
                    // Add job to Redis queue for processing
                    await redis.lpush('pdf_jobs', JSON.stringify({url: blob.url, name: blob.pathname}))
                    console.log('Job added to Redis queue');
                } catch (error) {
                    console.error('Error in onUploadCompleted:', error);
                    // Still add to Redis queue even if database save fails
                    await redis.lpush('pdf_jobs', JSON.stringify({url: blob.url, name: blob.pathname}))
                }
            }
        }).then(json => NextResponse.json(json));
    } catch (error) {
        console.error('Error in upload API:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
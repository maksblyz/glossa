import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis';
import { db } from '@/db';

const redis = Redis.fromEnv();

// Function to extract original filename from blob pathname
function extractOriginalFileName(pathname: string): string {
    if (!pathname) return 'Untitled PDF';
    
    // Remove the random suffix that Vercel Blob adds
    const withoutExtension = pathname.replace(/\.pdf$/i, '');
    
    // Split by the last dash and take the first part 
    const parts = withoutExtension.split('-');
    if (parts.length > 1) {
        // Remove the last part (random suffix) and join the rest
        const originalName = parts.slice(0, -1).join('-');
        return originalName || 'Untitled PDF';
    }
    
    // If no random suffix found, return the name without .pdf extension
    return withoutExtension || 'Untitled PDF';
}

export async function POST(req: Request) {
    try {
    const body = (await req.json()) as HandleUploadBody;
        console.log('Upload request body:', body);

    // Get user ID from headers for token payload
    let userId = null;
    try {
        const userHeader = req.headers.get('x-user-id');
        if (userHeader) {
            userId = userHeader;
            console.log('User ID from header for token:', userId);
        }
    } catch (error) {
        console.error('Error reading user ID from headers:', error);
    }

    return handleUpload({
        request: req,
        body,

        //issue token
            onBeforeGenerateToken: async () => {
                console.log('Generating token...');
                return {
            allowedContentTypes: ['application/pdf'],
                    addRandomSuffix: true,
            tokenPayload: JSON.stringify({ userId })
                };
            },

        //called once browser PUTS file
        onUploadCompleted: async ({ blob, tokenPayload }) => {
                try {
                    console.log('Upload completed for blob:', blob.pathname);
                    console.log('Blob URL:', blob.url);
                    
                    // Get the current user from token payload
                    let userId = null;
                    try {
                        if (tokenPayload) {
                            const payload = JSON.parse(tokenPayload);
                            userId = payload.userId;
                            console.log('User ID from token payload:', userId);
                        } else {
                            console.log('No token payload found');
                        }
                    } catch (authError) {
                        console.error('Error reading user ID from token payload:', authError);
                        // Continue without user ID - file will be created but not associated with user
                    }
                    
                    // Create file record
                    const fileRecord = await db.file.create({
                        data: {
                            name: extractOriginalFileName(blob.pathname),
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
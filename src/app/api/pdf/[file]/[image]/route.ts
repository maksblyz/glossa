// src/app/api/pdf/[file]/[image]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { file: string; image: string } }
) {
  const filePath = path.join(process.cwd(), 'public', 'pdf-assets', params.file, params.image);

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return new NextResponse('Not found', { status: 404 });
    }
    const fileBuffer = fs.readFileSync(filePath);
    // Guess content type from extension
    const ext = path.extname(params.image).toLowerCase();
    const contentType =
      ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.gif'
        ? 'image/gif'
        : 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    return new NextResponse('Not found', { status: 404 });
  }
}
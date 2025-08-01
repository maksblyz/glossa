import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(
    _req: NextRequest,
    { params }: { params : Promise<{ file: string }> }
) {
    const { file } = await params;
    const objects = await prisma.pdfObject.findMany({
        where: { file },
        orderBy: [{ page: 'asc' }, { id: 'asc' }],
        select: { 
            id: true,
            page: true, 
            type: true, 
            content: true, 
            bbox: true,
            page_width: true,
            page_height: true
        },
    });

    return NextResponse.json(objects);
}
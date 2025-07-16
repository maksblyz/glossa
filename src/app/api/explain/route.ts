import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const runtime = 'edge';          // use Vercel Edge Runtime (flushes chunks asap)
export const dynamic = 'force-dynamic'; // opt-out of Next.js static caching
export const maxDuration = 60; 

const PYTHON_API_URL = 'http://127.0.0.1:5328/context';

export async function POST(req: NextRequest) {
  try {
    const { content, fileName, type } = await req.json();

    if (!content || !fileName)
      return NextResponse.json(
        { error: 'content and fileName are required' },
        { status: 400 },
      );

    let context = '';
    try {
      const res = await fetch(PYTHON_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, content }),
      });
      if (res.ok) context = (await res.json()).context;
    } catch (e) {
      console.warn('context service unavailable:', e);
    }

    const prompt =
      type === 'Image'
        ? `The following is an image from a document …\n\nImage: "${content}"\nContext:\n${context || 'None'}`
        : type === 'Table'
        ? `The following is a data table …\n\n${content}\nContext:\n${context || 'None'}`
        : type === 'TableCaption'
        ? `Explain this table caption: "${content}"\nContext:\n${context || 'None'}`
        : `Context:\n${context || 'None'}\n\nContent: "${content}"\nExplain in 3‑5 sentences for a high‑school reader. Use LaTeX for math.`;

    const result = streamText({
      model: openai('gpt-4o-mini'),     // ← model ID is valid in your account
      prompt,
      system: 'You are an expert academic explainer.',
      temperature: 0.2,
      maxTokens: 1024,
      onError: ({ error }) => console.error('stream error:', error),
    });

    return result.toDataStreamResponse();
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'failed to get explanation' }, { status: 500 });
  }
}

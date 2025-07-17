import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const runtime = 'edge';          // use Vercel Edge Runtime (flushes chunks asap)
export const dynamic = 'force-dynamic'; // opt-out of Next.js static caching
export const maxDuration = 60; 

const PYTHON_API_URL = 'http://127.0.0.1:5328/context';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Check if this is a chat request (has messages array)
    if (body.messages && Array.isArray(body.messages)) {
      // Handle chat conversation
      const { messages, fileName, type, imageUrl, initialExplanation } = body;
      
      if (!fileName) {
        return NextResponse.json(
          { error: 'fileName is required for chat' },
          { status: 400 },
        );
      }

      // For chat, we need to handle the conversation context
      // The first message should contain the original content and image
      const firstMessage = messages[0];
      let context = '';
      
      try {
        const res = await fetch(PYTHON_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName, content: firstMessage.content }),
        });
        if (res.ok) context = (await res.json()).context;
      } catch (e) {
        console.warn('context service unavailable:', e);
      }

      // Build the conversation with proper context
      const systemPrompt = type === 'Image'
        ? 'You are an expert academic explainer. Provide concise, direct answers to follow-up questions about this image.'
        : type === 'Table'
        ? 'You are an expert academic explainer. Provide concise, direct answers to follow-up questions about this data table.'
        : 'You are an expert academic explainer. Provide concise, direct answers to follow-up questions about this content.';

      // If we have an image, we need to include it in the first message
      if (imageUrl && (type === 'Image' || type === 'Table')) {
        const result = streamText({
          model: openai('gpt-4o-mini'),
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: `Context about the document: ${context || 'None'}\n\nOriginal content: ${firstMessage.content}\n\nInitial explanation: ${initialExplanation || 'None'}` },
                {
                  type: 'image',
                  image: imageUrl,
                },
              ],
            },
            ...messages.slice(1), // Include all subsequent messages
          ],
          temperature: 0.2,
          maxTokens: 1024,
          onError: ({ error }) => console.error('stream error:', error),
        });

        return result.toDataStreamResponse();
      } else {
        // Text-only conversation
        const result = streamText({
          model: openai('gpt-4o-mini'),
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: `Context about the document: ${context || 'None'}\n\nOriginal content: ${firstMessage.content}\n\nInitial explanation: ${initialExplanation || 'None'}`,
            },
            ...messages.slice(1), // Include all subsequent messages
          ],
          temperature: 0.2,
          maxTokens: 1024,
          onError: ({ error }) => console.error('stream error:', error),
        });

        return result.toDataStreamResponse();
      }
    } else {
      // Handle initial explanation (existing logic)
      const { content, fileName, type, imageUrl } = body;

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

      // Handle different content types
      if ((type === 'Image' || type === 'Table') && imageUrl) {
        // For images and tables, we'll use the image URL directly with the AI model
        const promptText = type === 'Image' 
          ? `The following is an image from a document. Please explain what you see in this image in 3-5 sentences for a high-school reader.\n\nContext:\n${context || 'None'}`
          : `The following is a data table from a document. Please analyze this table and explain its key findings, structure, and significance in 3-5 sentences for a high-school reader.\n\nContext:\n${context || 'None'}`;
        
        const systemPrompt = type === 'Image'
          ? 'You are an expert academic explainer. Analyze the image and provide a clear, educational explanation.'
          : 'You are an expert academic explainer. Analyze the table data and provide a clear, educational explanation of its structure and key insights.';

        const result = streamText({
          model: openai('gpt-4o-mini'),
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: promptText },
                {
                  type: 'image',
                  image: imageUrl,
                },
              ],
            },
          ],
          system: systemPrompt,
          temperature: 0.2,
          maxTokens: 1024,
          onError: ({ error }) => console.error('stream error:', error),
        });

        return result.toDataStreamResponse();
      } else {
        // For text content (including tables without images)
        const prompt =
          type === 'Table'
            ? `The following is a data table …\n\n${content}\nContext:\n${context || 'None'}`
            : type === 'TableCaption'
            ? `Explain this table caption: "${content}"\nContext:\n${context || 'None'}`
            : `Context:\n${context || 'None'}\n\nContent: "${content}"\nExplain in 3‑5 sentences for a high‑school reader. Use LaTeX for math.`;

        const result = streamText({
          model: openai('gpt-4o-mini'),
          prompt,
          system: 'You are an expert academic explainer.',
          temperature: 0.2,
          maxTokens: 1024,
          onError: ({ error }) => console.error('stream error:', error),
        });

        return result.toDataStreamResponse();
      }
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'failed to get explanation' }, { status: 500 });
  }
}

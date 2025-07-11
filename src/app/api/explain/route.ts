// route.ts

import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

// URL for the Python context server
const PYTHON_API_URL = 'http://127.0.0.1:5328/context';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received request body:', body);
    const { content, fileName, type } = body;
    console.log('Extracted content:', content);
    console.log('Extracted fileName:', fileName);
    console.log('Extracted type:', type);
    if (!content || !fileName) {
      console.log('Validation failed - missing content or fileName');
      return NextResponse.json({ error: 'Content and fileName are required' }, { status: 400 });
    }

    // Fetch context as before
    let context = '';
    try {
      const contextResponse = await fetch(PYTHON_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, content }),
      });
      if (contextResponse.ok) {
        const contextData = await contextResponse.json();
        context = contextData.context;
      }
    } catch (e) {
      console.warn('Could not fetch context from Python API:', e);
    }

    // Build the prompt as before (reuse your existing logic)
    let prompt = '';
    if (type === 'Image') {
      prompt = `The following is an image from a document. Please describe what the image likely shows, its context, and any important details. If an alt text or caption is provided, use it for context.\n\nImage description or alt text: "${content}"\n\nContext from the document:\n---\n${context || "No additional context available."}\n---`;
    } else if (type === 'Table') {
      prompt = `The following is a data table from a document. Please summarize what the table shows, explain the meaning of the columns and rows, and highlight any patterns or insights. If a caption is provided, use it for context.\n\nTable content:\n${content}\n\nContext from the document:\n---\n${context || "No additional context available."}\n---`;
    } else if (type === 'TableCaption') {
      prompt = `The following is a table caption from a document. Please explain what this caption means and how it relates to the table.\n\nTable caption: "${content}"\n\nContext from the document:\n---\n${context || "No additional context available."}\n---`;
    } else {
      prompt = `Based on the following context from a document, please explain the "Content to Explain".\n\nContext from the document:\n---\n${context || "No additional context available."}\n---\n\nContent to Explain: "${content}"\n\nPlease provide a helpful, concise explanation for a high school student. Limit your explanation to 3-5 sentences and do not repeat the original content. Use LaTeX for mathematical symbols.`;
    }

    // ⭐️ Use OpenAI GPT-4o-mini
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert academic explainer. Answer clearly and concisely.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1024,
    });

    const explanation = completion.choices[0].message.content;

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to get explanation' },
      { status: 500 }
    );
  }
}
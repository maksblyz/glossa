// route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// URL for the Python context server
const PYTHON_API_URL = 'http://127.0.0.1:5328/context';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received request body:', body);
    
    const { content, fileName } = body;

    console.log('Extracted content:', content);
    console.log('Extracted fileName:', fileName);
    console.log('Content type:', typeof content);
    console.log('FileName type:', typeof fileName);

    if (!content || !fileName) {
      console.log('Validation failed - missing content or fileName');
      console.log('Content is falsy:', !content);
      console.log('FileName is falsy:', !fileName);
      return NextResponse.json({ error: 'Content and fileName are required' }, { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // ⭐️ 1. Fetch context from your Python service
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
      // Proceed without context if the service is down
    }

    // ⭐️ 2. Create a new, context-aware prompt
    const model = new GoogleGenerativeAI(GEMINI_API_KEY).getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Based on the following context from a document, please explain the "Content to Explain".

Context from the document:
---
${context || "No additional context available."}
---

Content to Explain: "${content}"

Please provide a helpful, concise explanation for a high school student. Limit your explanation to 3-5 sentences and do not repeat the original content. Use LaTeX for mathematical symbols.`;

    // ⭐️ 3. Generate content with the new prompt
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const explanation = response.text();

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return NextResponse.json(
      { error: 'Failed to get explanation' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // Initialize the Google Generative AI with the API key
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    // Get the model (using the same model as in llm_cleaner.py)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Please explain the following content in a clear, concise way. If it's a mathematical formula, explain what it represents and its significance. If it's text, provide a brief explanation of the key concepts. Explain like you're explaining to a high school student. Limit your explanation to 3-5 sentences, and do not repeat the original content:

Content: "${content}"

Please provide a helpful, concise explanation that would be useful for someone studying this material.`;

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
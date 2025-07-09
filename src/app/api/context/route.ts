import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { file_name, sentence, type } = await request.json();

    if (!file_name || !sentence) {
      return NextResponse.json({ error: 'File name and sentence are required' }, { status: 400 });
    }

    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: 'DeepSeek API key not configured' }, { status: 500 });
    }

    // Initialize DeepSeek client
    const client = new OpenAI({
      apiKey: DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com"
    });

    // Call the Python script to get context
    const { spawn } = require('child_process');
    const pythonProcess = spawn('python3', ['src/worker/get_context.py'], {
      env: { ...process.env, PYTHONPATH: 'src/worker' }
    });

    // Send data to Python script
    const inputData = JSON.stringify({ file_name, sentence, type });
    pythonProcess.stdin.write(inputData);
    pythonProcess.stdin.end();

    let outputData = '';
    let errorData = '';

    // Collect output from Python script
    pythonProcess.stdout.on('data', (data: Buffer) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data: Buffer) => {
      errorData += data.toString();
    });

    // Wait for Python script to complete
    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code: number) => {
        if (code === 0) {
          resolve(outputData);
        } else {
          reject(new Error(`Python script failed with code ${code}: ${errorData}`));
        }
      });
    });

    // Parse the context data from Python
    const contextData = JSON.parse(outputData);
    
    // Build a comprehensive prompt for the LLM
    const systemPrompt = `You are an expert academic tutor who provides clear, concise explanations of complex concepts. Your explanations should be:

1. **Clear and accessible**: Explain concepts in simple terms that a high school student could understand
2. **Concise**: Keep explanations to 2-4 sentences maximum
3. **Contextual**: Use the provided context to give relevant explanations
4. **Educational**: Focus on the "why" and "how" rather than just restating the content
5. **Accurate**: Ensure all information is factually correct

For mathematical equations, explain what the equation represents, its significance, and how it relates to the broader topic.
For text content, explain the key concepts, their importance, and how they fit into the larger context.`;

    let userPrompt = `Please explain the following ${type === 'equation' ? 'mathematical equation' : 'text'} in a clear, educational way:

**Content to explain:** "${sentence}"

**Context from the document:**
`;

    // Add hierarchical context
    if (contextData.hierarchical_context) {
      const ctx = contextData.hierarchical_context;
      
      if (ctx.section_title) {
        userPrompt += `- Section: ${ctx.section_title}\n`;
      }
      
      if (ctx.paragraph_text) {
        userPrompt += `- Paragraph context: ${ctx.paragraph_text.substring(0, 200)}...\n`;
      }
      
      if (ctx.similar_chunks_with_context && ctx.similar_chunks_with_context.length > 0) {
        userPrompt += `- Related content:\n`;
        ctx.similar_chunks_with_context.slice(0, 2).forEach((item: any, index: number) => {
          if (item.section_title) {
            userPrompt += `  ${index + 1}. From section "${item.section_title}": ${item.chunk.content.substring(0, 150)}...\n`;
          }
        });
      }
    }

    // Add immediate context
    if (contextData.immediate_context) {
      const ctx = contextData.immediate_context;
      userPrompt += `\n**Immediate context:**\n`;
      if (ctx.previous) {
        userPrompt += `- Previous: ${ctx.previous.substring(0, 100)}...\n`;
      }
      if (ctx.next) {
        userPrompt += `- Next: ${ctx.next.substring(0, 100)}...\n`;
      }
    }

    userPrompt += `\nPlease provide a clear, concise explanation that helps the reader understand this ${type === 'equation' ? 'equation' : 'concept'} in the context of the document.`;

    // Call DeepSeek API for explanation
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 300
    });

    const explanation = response.choices[0].message.content;

    return NextResponse.json({ 
      explanation,
      context_data: contextData 
    });

  } catch (error) {
    console.error('Error in context API:', error);
    return NextResponse.json(
      { error: 'Failed to get explanation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
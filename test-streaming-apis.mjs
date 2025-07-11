// Simple test script for the new streaming APIs
import fetch from 'node-fetch';

async function testFormatAPI() {
  console.log('Testing format API...');
  
  const testChunks = [
    { content: "1.2 Supervised learning" },
    { content: "One way to define the problem of supervised learning is to assume that we have a dataset of examples." },
    { content: "θ = argmin L(θ) (1.6)" },
    { content: "This is called empirical risk minimization." }
  ];

  try {
    const response = await fetch('http://localhost:3000/api/format', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunks: testChunks })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('Format API response status:', response.status);
    
    // Read streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            break;
          }
          if (data) {
            result += data;
            process.stdout.write(data); // Show streaming output
          }
        }
      }
    }

    console.log('\n\nFormat API test completed!');
    console.log('Result length:', result.length);
    console.log('Contains academic-paper div:', result.includes('academic-paper'));
    console.log('Contains clickable-sentence:', result.includes('clickable-sentence'));

  } catch (error) {
    console.error('Format API test failed:', error);
  }
}

async function testExplainAPI() {
  console.log('\nTesting explain API...');
  
  try {
    const response = await fetch('http://localhost:3000/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_name: 'test.pdf',
        sentence: 'θ = argmin L(θ)',
        type: 'equation'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('Explain API response status:', response.status);
    
    // Read streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            break;
          }
          if (data) {
            result += data;
            process.stdout.write(data); // Show streaming output
          }
        }
      }
    }

    console.log('\n\nExplain API test completed!');
    console.log('Result length:', result.length);
    console.log('Contains explanation:', result.length > 0);

  } catch (error) {
    console.error('Explain API test failed:', error);
  }
}

async function runTests() {
  console.log('Starting streaming API tests...\n');
  
  await testFormatAPI();
  await testExplainAPI();
  
  console.log('\nAll tests completed!');
}

// Run tests if this file is executed directly
runTests().catch(console.error); 
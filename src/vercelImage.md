Image Parts
User messages can include image parts. An image can be one of the following:

base64-encoded image:
string with base-64 encoded content
data URL string, e.g. data:image/png;base64,...
binary image:
ArrayBuffer
Uint8Array
Buffer
URL:
http(s) URL string, e.g. https://example.com/image.png
URL object, e.g. new URL('https://example.com/image.png')
Example: Binary image (Buffer)

const result = await generateText({
  model,
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Describe the image in detail.' },
        {
          type: 'image',
          image: fs.readFileSync('./data/comic-cat.png'),
        },
      ],
    },
  ],
});
Example: Base-64 encoded image (string)

const result = await generateText({
  model: 'openai/gpt-4.1',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Describe the image in detail.' },
        {
          type: 'image',
          image: fs.readFileSync('./data/comic-cat.png').toString('base64'),
        },
      ],
    },
  ],
});
Example: Image URL (string)

const result = await generateText({
  model: 'openai/gpt-4.1',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Describe the image in detail.' },
        {
          type: 'image',
          image:
            'https://github.com/vercel/ai/blob/main/examples/ai-core/data/comic-cat.png?raw=true',
        },
      ],
    },
  ],
});

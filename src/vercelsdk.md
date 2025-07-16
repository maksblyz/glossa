Provider Options
You can pass through additional provider-specific metadata to enable provider-specific functionality at 3 levels.

Function Call Level
Functions like streamText or generateText accept a providerOptions property.

Adding provider options at the function call level should be used when you do not need granular control over where the provider options are applied.


const { text } = await generateText({
  model: azure('your-deployment-name'),
  providerOptions: {
    openai: {
      reasoningEffort: 'low',
    },
  },
});
Message Level
For granular control over applying provider options at the message level, you can pass providerOptions to the message object:


import { ModelMessage } from 'ai';

const messages: ModelMessage[] = [
  {
    role: 'system',
    content: 'Cached system message',
    providerOptions: {
      // Sets a cache control breakpoint on the system message
      anthropic: { cacheControl: { type: 'ephemeral' } },
    },
  },
];
Message Part Level
Certain provider-specific options require configuration at the message part level:


import { ModelMessage } from 'ai';

const messages: ModelMessage[] = [
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Describe the image in detail.',
        providerOptions: {
          openai: { imageDetail: 'low' },
        },
      },
      {
        type: 'image',
        image:
          'https://github.com/vercel/ai/blob/main/examples/ai-core/data/comic-cat.png?raw=true',
        // Sets image detail configuration for image part:
        providerOptions: {
          openai: { imageDetail: 'low' },
        },
      },
    ],
  },
];
AI SDK UI hooks like useChat return arrays of UIMessage objects, which do not support provider options. We recommend using the convertToModelMessages function to convert UIMessage objects to ModelMessage objects before applying or appending message(s) or message parts with providerOptions.

User Messages
Text Parts
Text content is the most common type of content. It is a string that is passed to the model.

If you only need to send text content in a message, the content property can be a string, but you can also use it to send multiple content parts.
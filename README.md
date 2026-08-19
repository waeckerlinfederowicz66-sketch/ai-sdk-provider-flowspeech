# FlowSpeech Provider for the AI SDK

Use [FlowSpeech text to speech](https://flowspeech.io/) with the Vercel AI SDK `generateSpeech` API. The provider implements the AI SDK `SpeechModelV4` interface and supports API-key authentication, voice selection, abort signals, request headers, and natural-language delivery instructions.

## Installation

```bash
npm install ai ai-sdk-provider-flowspeech
```

## Setup

Set the API key in your environment. Never commit a real key.

```bash
export FLOWSPEECH_API_KEY=sk_your_flowspeech_api_key
```

## Generate speech

```ts
import { generateSpeech } from 'ai'
import { flowSpeech } from 'ai-sdk-provider-flowspeech'

const result = await generateSpeech({
  model: flowSpeech.speech('flowspeech-tts'),
  text: 'Welcome to FlowSpeech. This audio was generated through the AI SDK.',
  voice: 'Kore',
  instructions: 'Warm, clear narration with a relaxed pace.',
})

await Bun.write('speech.wav', result.audio.uint8Array)
```

## Custom provider

Use `createFlowSpeech` when you need an explicit key, a custom endpoint, extra headers, or a test fetch implementation.

```ts
import { createFlowSpeech } from 'ai-sdk-provider-flowspeech'

const flowSpeech = createFlowSpeech({
  apiKey: process.env.FLOWSPEECH_API_KEY,
  defaultVoice: 'Kore',
})
```

The default endpoint is `https://flowspeech.io/api/ai/text-to-speech`. No provider credentials or private FlowSpeech configuration are included in this repository.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

## License

MIT

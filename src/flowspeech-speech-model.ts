import type { SpeechModelV4 } from '@ai-sdk/provider'
import { FlowSpeechClient, FlowSpeechError, rejectUnsupported, type FlowSpeechClientOptions, type FlowSpeechInput } from './flowspeech-client.js'

/** Framework identifier only; no model field is sent to the API. */
export type FlowSpeechModelId = 'flowspeech-tts' | (string & {})
export interface FlowSpeechSpeechModelConfig extends FlowSpeechClientOptions {
  provider: string
  defaultVoice: string
  currentDate?: () => Date
}
export class FlowSpeechSpeechModel implements SpeechModelV4 {
  readonly specificationVersion = 'v4'
  get provider(): string { return this.config.provider }
  constructor(readonly modelId: FlowSpeechModelId, private readonly config: FlowSpeechSpeechModelConfig) {
    if (modelId !== 'flowspeech-tts') throw new FlowSpeechError('Unsupported FlowSpeech model identifier', 'unsupported_option')
  }
  async doGenerate(options: Parameters<SpeechModelV4['doGenerate']>[0]): Promise<Awaited<ReturnType<SpeechModelV4['doGenerate']>>> {
    rejectUnsupported({ instructions: options.instructions, speed: options.speed, language: options.language }, [])
    if (options.outputFormat !== undefined && options.outputFormat !== 'wav') throw new FlowSpeechError('FlowSpeech v1 only supports WAV output', 'unsupported_option')
    const providerOptions = options.providerOptions?.flowspeech ?? {}
    rejectUnsupported(providerOptions, ['segments', 'requestId'])
    if (providerOptions.segments !== undefined && options.text.trim()) throw new FlowSpeechError('Set text to an empty string when supplying explicit segments', 'invalid_request')
    const input: FlowSpeechInput = providerOptions.segments === undefined
      ? { mode: 'single', text: options.text, voiceName: options.voice ?? this.config.defaultVoice }
      : { mode: 'multi', segments: providerOptions.segments as Extract<FlowSpeechInput, { mode: 'multi' }>['segments'] }
    const headers = new Headers(this.config.headers)
    for (const [name, value] of Object.entries(options.headers ?? {})) if (value !== undefined) headers.set(name, value)
    const result = await new FlowSpeechClient({ ...this.config, headers: Object.fromEntries(headers) }).generate(input, {
      signal: options.abortSignal,
      requestId: providerOptions.requestId as string | undefined,
    })
    return {
      audio: result.audio,
      warnings: [],
      request: { body: result.requestBody },
      response: { timestamp: this.config.currentDate?.() ?? new Date(), modelId: this.modelId, headers: result.headers, body: result.job },
      providerMetadata: { flowspeech: { requestId: result.requestId, jobId: result.job.id, usage: { ...result.job.usage } } },
    }
  }
}

import type { SpeechModelV4, SharedV4Warning } from '@ai-sdk/provider'
import type { FetchFunction } from '@ai-sdk/provider-utils'

export type FlowSpeechModelId = 'flowspeech-tts' | (string & {})

export interface FlowSpeechSpeechModelConfig {
  provider: string
  baseUrl: string
  headers: () => Record<string, string>
  fetch?: FetchFunction
  defaultVoice: string
  currentDate?: () => Date
}

interface FlowSpeechApiResponse {
  code: number
  message?: string
  data?: {
    mimeType: string
    audioBase64: string
    sampleRate?: number
    numChannels?: number
    bitsPerSample?: number
  }
}

export class FlowSpeechSpeechModel implements SpeechModelV4 {
  readonly specificationVersion = 'v4'

  get provider(): string {
    return this.config.provider
  }

  constructor(
    readonly modelId: FlowSpeechModelId,
    private readonly config: FlowSpeechSpeechModelConfig,
  ) {}

  async doGenerate(
    options: Parameters<SpeechModelV4['doGenerate']>[0],
  ): Promise<Awaited<ReturnType<SpeechModelV4['doGenerate']>>> {
    const warnings: SharedV4Warning[] = []
    const voiceName = options.voice || this.config.defaultVoice

    if (options.outputFormat) {
      warnings.push({
        type: 'unsupported',
        feature: 'outputFormat',
        details:
          'FlowSpeech selects the audio format server-side; outputFormat was ignored.',
      })
    }
    if (options.language) {
      warnings.push({
        type: 'unsupported',
        feature: 'language',
        details:
          'FlowSpeech detects language from the input text; language was ignored.',
      })
    }
    if (options.speed != null) {
      warnings.push({
        type: 'unsupported',
        feature: 'speed',
        details:
          'Use natural-language instructions to direct pacing; speed was ignored.',
      })
    }

    const body = {
      text: options.text,
      originalText: options.text,
      speakers: [{ voiceName }],
      ...(options.instructions ? { prompt: options.instructions } : {}),
    }

    const fetcher = this.config.fetch ?? globalThis.fetch
    const response = await fetcher(this.config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers(),
        ...options.headers,
      },
      body: JSON.stringify(body),
      signal: options.abortSignal,
    })

    const responseHeaders = Object.fromEntries(response.headers.entries())
    const responseText = await response.text()

    let payload: FlowSpeechApiResponse | undefined
    try {
      payload = JSON.parse(responseText) as FlowSpeechApiResponse
    } catch {
      // Preserve the response text in the error below without exposing headers.
    }

    if (!response.ok || payload?.code !== 0 || !payload.data?.audioBase64) {
      const message =
        payload?.message ||
        responseText ||
        `FlowSpeech API request failed with HTTP ${response.status}`
      throw new Error(`FlowSpeech API error (${response.status}): ${message}`)
    }

    return {
      audio: decodeBase64(payload.data.audioBase64),
      warnings,
      request: { body: JSON.stringify(body) },
      response: {
        timestamp: this.config.currentDate?.() ?? new Date(),
        modelId: this.modelId,
        headers: responseHeaders,
        body: responseText,
      },
    }
  }
}

function decodeBase64(value: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64'))
  }

  const binary = globalThis.atob(value)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

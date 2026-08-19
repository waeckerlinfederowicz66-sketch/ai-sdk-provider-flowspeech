import {
  NoSuchModelError,
  type ProviderV4,
  type SpeechModelV4,
} from '@ai-sdk/provider'
import { loadApiKey, type FetchFunction } from '@ai-sdk/provider-utils'
import {
  FlowSpeechSpeechModel,
  type FlowSpeechModelId,
} from './flowspeech-speech-model.js'

export interface FlowSpeechProvider extends ProviderV4 {
  /** Creates a FlowSpeech speech generation model. */
  speech(modelId?: FlowSpeechModelId): SpeechModelV4
}

export interface FlowSpeechProviderSettings {
  /** FlowSpeech API key. Defaults to FLOWSPEECH_API_KEY. */
  apiKey?: string
  /** Override the public FlowSpeech TTS endpoint. */
  baseUrl?: string
  /** Additional request headers. */
  headers?: Record<string, string>
  /** Custom fetch implementation for middleware and tests. */
  fetch?: FetchFunction
  /** Voice used when generateSpeech does not specify one. */
  defaultVoice?: string
}

export function createFlowSpeech(
  settings: FlowSpeechProviderSettings = {},
): FlowSpeechProvider {
  const createSpeechModel = (modelId: FlowSpeechModelId = 'flowspeech-tts') =>
    new FlowSpeechSpeechModel(modelId, {
      provider: 'flowspeech.speech',
      baseUrl:
        settings.baseUrl ?? 'https://flowspeech.io/api/ai/text-to-speech',
      defaultVoice: settings.defaultVoice ?? 'Kore',
      fetch: settings.fetch,
      headers: () => ({
        Authorization: `Bearer ${loadApiKey({
          apiKey: settings.apiKey,
          environmentVariableName: 'FLOWSPEECH_API_KEY',
          description: 'FlowSpeech',
        })}`,
        ...settings.headers,
      }),
    })

  const unsupported = (
    modelType: 'languageModel' | 'embeddingModel' | 'imageModel',
    modelId: string,
  ): never => {
    throw new NoSuchModelError({
      modelId,
      modelType,
      message: `FlowSpeech does not provide ${modelType} models`,
    })
  }

  return {
    specificationVersion: 'v4',
    speech: createSpeechModel,
    speechModel: createSpeechModel,
    languageModel: modelId => unsupported('languageModel', modelId),
    embeddingModel: modelId => unsupported('embeddingModel', modelId),
    imageModel: modelId => unsupported('imageModel', modelId),
  } as FlowSpeechProvider
}

export const flowSpeech = createFlowSpeech()

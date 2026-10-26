import { NoSuchModelError, type ProviderV4, type SpeechModelV4 } from '@ai-sdk/provider'
import { FlowSpeechSpeechModel, type FlowSpeechModelId } from './flowspeech-speech-model.js'
import type { FlowSpeechClientOptions } from './flowspeech-client.js'

export interface FlowSpeechProvider extends ProviderV4 {
  speech(modelId?: FlowSpeechModelId): SpeechModelV4
}
export interface FlowSpeechProviderSettings extends FlowSpeechClientOptions {
  defaultVoice?: string
}
export function createFlowSpeech(settings: FlowSpeechProviderSettings = {}): FlowSpeechProvider {
  const createSpeechModel = (modelId: FlowSpeechModelId = 'flowspeech-tts') =>
    new FlowSpeechSpeechModel(modelId, {
      ...settings,
      provider: 'flowspeech.speech',
      defaultVoice: settings.defaultVoice ?? 'Kore',
    })
  const unsupported = (modelType: 'languageModel' | 'embeddingModel' | 'imageModel', modelId: string): never => {
    throw new NoSuchModelError({ modelId, modelType, message: 'FlowSpeech does not provide ' + modelType + ' models' })
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

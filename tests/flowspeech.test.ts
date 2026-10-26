import { generateSpeech } from 'ai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFlowSpeech } from '../src/index.js'
import { audio, job, jobId, json, requestId, wav } from './fixtures.js'
beforeEach(() => { vi.useFakeTimers(); vi.stubEnv('FLOWSPEECH_API_KEY', '') })
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })
describe('AI SDK SpeechModelV4', () => {
  it('returns binary WAV and recovery metadata through generateSpeech after polling', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(json(job('queued'), 202)).mockResolvedValueOnce(json(job())).mockResolvedValueOnce(audio())
    const provider = createFlowSpeech({ apiKey: 'unit-test-only', fetch: fetcher })
    const pending = generateSpeech({ model: provider.speech(), text: 'Hello', voice: 'Puck', outputFormat: 'wav', providerOptions: { flowspeech: { requestId } } })
    await vi.advanceTimersByTimeAsync(5000)
    const value = await pending
    expect(value.audio.uint8Array).toEqual(new Uint8Array(wav()))
    expect(value.audio.mediaType).toBe('audio/wav')
    expect(value.providerMetadata?.flowspeech).toMatchObject({ requestId, jobId })
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body))).toEqual({ input: { mode: 'single', text: 'Hello', voiceName: 'Puck' } })
    expect(fetcher.mock.calls[2]![1]?.headers).toBeUndefined()
  })
  it('accepts explicit segments via providerOptions and returns the raw v1 job response', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(json(job())).mockResolvedValueOnce(audio())
    const model = createFlowSpeech({ apiKey: 'unit-test-only', fetch: fetcher }).speech()
    const segments = [{ speaker: 'Alice', text: 'Welcome', voiceName: 'Kore' }, { speaker: 'Bob', text: 'Hello', voiceName: 'Puck' }]
    const result = await model.doGenerate({ text: '', providerOptions: { flowspeech: { segments, requestId } } })
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body))).toEqual({ input: { mode: 'multi', segments } })
    expect(result.response.body).toMatchObject({ id: jobId, status: 'success' })
    expect(result.warnings).toEqual([])
  })
  it.each([{ speed: 1 }, { language: 'en' }, { instructions: 'Calm' }, { outputFormat: 'mp3' }, { providerOptions: { flowspeech: { source: 'old' } } }])('rejects unsupported options %j before HTTP', async extra => {
    const fetcher = vi.fn<typeof fetch>()
    await expect(createFlowSpeech({ apiKey: 'unit-test-only', fetch: fetcher }).speech().doGenerate({ text: 'Hello', ...extra })).rejects.toMatchObject({ code: 'unsupported_option' })
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('prevents per-call headers from overriding authentication or request IDs', async () => {
    const fetcher = vi.fn<typeof fetch>()
    await expect(createFlowSpeech({ apiKey: 'unit-test-only', fetch: fetcher }).speech().doGenerate({ text: 'Hello', headers: { Authorization: 'Bearer other' } })).rejects.toMatchObject({ code: 'invalid_configuration' })
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('propagates abort signals from the SDK and preserves server recovery IDs', async () => {
    const controller = new AbortController()
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(json(job('queued')))
    const pending = expect(generateSpeech({
      model: createFlowSpeech({ apiKey: 'unit-test-only', fetch: fetcher }).speech(),
      text: 'Hello', abortSignal: controller.signal, providerOptions: { flowspeech: { requestId } },
    })).rejects.toMatchObject({ code: 'aborted', requestId, jobId })
    await vi.advanceTimersByTimeAsync(0)
    controller.abort()
    await pending
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each([404, 503])('does not let SDK retries recreate a recording after download HTTP %s', async status => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(json(job())).mockResolvedValueOnce(new Response(null, { status }))
    await expect(generateSpeech({ model: createFlowSpeech({ apiKey: 'unit-test-only', fetch: fetcher, maxRetries: 0 }).speech(), text: 'Hello', providerOptions: { flowspeech: { requestId } } })).rejects.toMatchObject({ code: 'download_error', jobId, requestId })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('loads credentials from the server environment, not browser cookies', async () => {
    vi.stubEnv('FLOWSPEECH_API_KEY', 'unit-test-only')
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(json(job())).mockResolvedValueOnce(audio())
    await createFlowSpeech({ fetch: fetcher }).speech().doGenerate({ text: 'Hello', providerOptions: { flowspeech: { requestId } } })
    expect(new Headers(fetcher.mock.calls[0]![1]?.headers).get('authorization')).toBe('Bearer unit-test-only')
  })
  it('rejects model selection and preserves unsupported-model contracts', () => {
    const provider = createFlowSpeech()
    expect(() => provider.speech('other')).toThrow('Unsupported')
    expect(() => provider.languageModel('other')).toThrow('does not provide')
  })
})

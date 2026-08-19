import { generateSpeech } from 'ai'
import { describe, expect, it, vi } from 'vitest'
import { createFlowSpeech } from '../src/index.js'

describe('FlowSpeech AI SDK provider', () => {
  it('generates speech through the AI SDK', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init?.headers).toMatchObject({
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      })
      expect(JSON.parse(String(init?.body))).toEqual({
        text: 'Hello from FlowSpeech',
        originalText: 'Hello from FlowSpeech',
        speakers: [{ voiceName: 'Kore' }],
      })

      return new Response(
        JSON.stringify({
          code: 0,
          data: {
            mimeType: 'audio/wav',
            audioBase64: Buffer.from('test-audio').toString('base64'),
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })

    const flowSpeech = createFlowSpeech({
      apiKey: 'test-key',
      fetch: fetchMock,
    })
    const result = await generateSpeech({
      model: flowSpeech.speech(),
      text: 'Hello from FlowSpeech',
      voice: 'Kore',
    })

    expect(Buffer.from(result.audio.uint8Array).toString()).toBe('test-audio')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('does not expose the API key in thrown errors', async () => {
    const flowSpeech = createFlowSpeech({
      apiKey: 'private-test-key',
      fetch: async () =>
        new Response(JSON.stringify({ code: 1, message: 'Invalid request' }), {
          status: 400,
        }),
    })

    await expect(
      generateSpeech({
        model: flowSpeech.speech(),
        text: 'Hello',
      }),
    ).rejects.not.toThrow('private-test-key')
  })
})

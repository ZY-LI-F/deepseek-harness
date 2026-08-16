import { describe, expect, it, vi } from 'vitest'
import {
  CAT_MEOW_COOLDOWN_MS,
  SOUL_AUDIO_RECIPES,
  SoulAudioRuntime,
  shouldPlayCatMeow,
} from '../src/client/audio.ts'

function fakeAudioContext() {
  const gain = {
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  }
  const oscillator = {
    type: 'sine',
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
  return {
    currentTime: 4,
    state: 'running',
    destination: {},
    createGain: vi.fn(() => gain),
    createOscillator: vi.fn(() => oscillator),
    resume: vi.fn(async () => {}),
    gain,
    oscillator,
  }
}

describe('SoulAudioRuntime', () => {
  it('ships five short semantic cues and starts strictly muted', () => {
    expect(Object.keys(SOUL_AUDIO_RECIPES)).toEqual([
      'cat-meow', 'cat-purr', 'hammer', 'garden-grow', 'cheers',
    ])
    const create = vi.fn()
    const audio = new SoulAudioRuntime(create)
    expect(audio.isEnabled()).toBe(false)
    expect(audio.play('cat-meow')).toBe(false)
    expect(create).not.toHaveBeenCalled()
  })

  it('schedules a bounded cue only after an explicit enable action', () => {
    const context = fakeAudioContext()
    const audio = new SoulAudioRuntime(() => context as unknown as AudioContext)
    audio.setEnabled(true)
    expect(audio.play('hammer')).toBe(true)
    expect(context.createOscillator).toHaveBeenCalledTimes(1)
    expect(context.oscillator.stop).toHaveBeenCalledWith(4 + SOUL_AUDIO_RECIPES.hammer.duration)
  })

  it('plays alternating preserved Qwen3-TTS samples before procedural fallback', () => {
    const createContext = vi.fn()
    const first = { play: vi.fn(async () => {}), preload: '', volume: 0 }
    const second = { play: vi.fn(async () => {}), preload: '', volume: 0 }
    const createMedia = vi.fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
    const audio = new SoulAudioRuntime(createContext, createMedia)
    audio.setEnabled(true)

    expect(audio.play('cat-meow')).toBe(true)
    expect(audio.play('cat-meow')).toBe(true)
    expect(createMedia).toHaveBeenCalledTimes(2)
    expect(createMedia.mock.calls[0]?.[0]).toMatch(/^data:audio\/wav;base64,/)
    expect(createMedia.mock.calls[1]?.[0]).not.toBe(createMedia.mock.calls[0]?.[0])
    expect(first).toMatchObject({ preload: 'auto', volume: .18 })
    expect(second).toMatchObject({ preload: 'auto', volume: .18 })
    expect(createContext).not.toHaveBeenCalled()
  })

  it('keeps autonomous meows rare and enforces one global cooldown', () => {
    expect(shouldPlayCatMeow('chase-ball', 'routine', CAT_MEOW_COOLDOWN_MS, .13)).toBe(true)
    expect(shouldPlayCatMeow('chase-ball', 'routine', CAT_MEOW_COOLDOWN_MS, .14)).toBe(false)
    expect(shouldPlayCatMeow('respond', 'user', CAT_MEOW_COOLDOWN_MS, .64)).toBe(true)
    expect(shouldPlayCatMeow('respond', 'user', CAT_MEOW_COOLDOWN_MS - 1, 0)).toBe(false)
    expect(shouldPlayCatMeow('wash-face', 'routine', Number.POSITIVE_INFINITY, .5)).toBe(false)
  })
})

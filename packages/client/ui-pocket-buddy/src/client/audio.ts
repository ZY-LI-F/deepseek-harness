import { PEACH_CAT_MEOW_SAMPLES } from './cat-audio-v3.generated.ts'

/** Shared, opt-in semantic sound face for the three soulful UI plugins. */
export type SoulAudioCue = 'cat-meow' | 'cat-purr' | 'hammer' | 'garden-grow' | 'cheers'

/** Cat actions that may receive a restrained meow accent. */
export type CatMeowAction = 'lick-paw' | 'wash-face' | 'chase-ball' | 'respond'
/** Whether a meow candidate came from an autonomous routine or user input. */
export type CatMeowContext = 'routine' | 'user'

/** A meow is a rare accent, never a sound attached to every animation. */
export const CAT_MEOW_COOLDOWN_MS = 30_000

const CAT_MEOW_CHANCE: Readonly<Record<CatMeowContext, Readonly<Record<CatMeowAction, number>>>> = {
  user: { 'lick-paw': .18, 'wash-face': .14, 'chase-ball': .45, respond: .65 },
  routine: { 'lick-paw': .05, 'wash-face': .04, 'chase-ball': .14, respond: 0 },
}

/**
 * Admit one optional meow under both a global cooldown and a context budget.
 * @param action - Visible cat action requesting the sound accent.
 * @param context - Autonomous or user-triggered playback context.
 * @param elapsedSinceLastMs - Milliseconds since the previous admitted meow.
 * @param sample - Normalized random sample used against the action budget.
 * @returns Whether this candidate may play a meow.
 */
export function shouldPlayCatMeow(
  action: CatMeowAction,
  context: CatMeowContext,
  elapsedSinceLastMs: number,
  sample: number,
): boolean {
  if (elapsedSinceLastMs < CAT_MEOW_COOLDOWN_MS) return false
  const normalizedSample = Number.isFinite(sample) ? Math.max(0, Math.min(.999_999, sample)) : 1
  return normalizedSample < CAT_MEOW_CHANCE[context][action]
}

/** Parameters for one bounded procedural audio cue. */
export interface SoulAudioRecipe {
  type: OscillatorType
  startHz: number
  endHz: number
  duration: number
  peakGain: number
}

/** Tiny procedural fallbacks; short Qwen3-TTS samples are preferred for cat meows. */
export const SOUL_AUDIO_RECIPES: Readonly<Record<SoulAudioCue, SoulAudioRecipe>> = Object.freeze({
  'cat-meow': { type: 'sine', startHz: 580, endHz: 820, duration: 0.46, peakGain: 0.055 },
  'cat-purr': { type: 'triangle', startHz: 76, endHz: 92, duration: 0.62, peakGain: 0.035 },
  hammer: { type: 'square', startHz: 190, endHz: 82, duration: 0.09, peakGain: 0.045 },
  'garden-grow': { type: 'sine', startHz: 330, endHz: 690, duration: 0.38, peakGain: 0.04 },
  cheers: { type: 'triangle', startHz: 520, endHz: 780, duration: 0.52, peakGain: 0.045 },
})

type AudioContextFactory = () => AudioContext | undefined

/** Minimal HTML audio surface used for embedded opt-in samples. */
export interface SoulAudioMedia {
  pause?: () => void
  play: () => Promise<void> | void
  preload: string
  volume: number
}

type AudioMediaFactory = (source: string) => SoulAudioMedia | undefined

function createBrowserAudioContext(): AudioContext | undefined {
  const scope = globalThis as unknown as {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }
  const AudioContextCtor = scope.AudioContext ?? scope.webkitAudioContext
  return AudioContextCtor === undefined ? undefined : new AudioContextCtor()
}

function createBrowserAudioMedia(source: string): SoulAudioMedia | undefined {
  const scope = globalThis as unknown as { Audio?: new (source?: string) => HTMLAudioElement }
  return scope.Audio === undefined ? undefined : new scope.Audio(source)
}

/** Lazily owns one Web Audio context; no audio node is created until the user enables sound. */
export class SoulAudioRuntime {
  private enabled = false
  private context: AudioContext | undefined
  private media: SoulAudioMedia[] = []
  private sampleCursor = 0

  constructor(
    private readonly createContext: AudioContextFactory = createBrowserAudioContext,
    private readonly createMedia: AudioMediaFactory = createBrowserAudioMedia,
  ) {}

  /**
   * Return whether user-triggered audio playback is enabled.
   *
   * @returns The current opt-in audio preference.
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Enable or mute future cue playback without creating an audio context.
   *
   * @param enabled - Whether later semantic cues may play.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * Play one short cue without throwing into the UI.
   *
   * @param cue - Semantic cue selected by the visible companion action.
   * @returns Whether playback was admitted by an enabled, supported runtime.
   */
  play(cue: SoulAudioCue): boolean {
    if (!this.enabled) return false
    if (cue === 'cat-meow' && this.playCatSample()) return true
    return this.playProcedural(cue)
  }

  private playCatSample(): boolean {
    try {
      const source = PEACH_CAT_MEOW_SAMPLES[this.sampleCursor % PEACH_CAT_MEOW_SAMPLES.length]
      this.sampleCursor += 1
      if (source === undefined) return false
      const media = this.createMedia(source)
      if (media === undefined) return false
      media.preload = 'auto'
      media.volume = .18
      this.media = [...this.media.slice(-2), media]
      const playback = media.play()
      if (playback !== undefined) void playback.catch(() => { this.playProcedural('cat-meow') })
      return true
    } catch {
      return false
    }
  }

  private playProcedural(cue: SoulAudioCue): boolean {
    try {
      this.context ??= this.createContext()
      const context = this.context
      if (context === undefined) return false
      if (context.state === 'suspended') void context.resume()
      const recipe = SOUL_AUDIO_RECIPES[cue]
      const now = context.currentTime
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = recipe.type
      oscillator.frequency.setValueAtTime(recipe.startHz, now)
      oscillator.frequency.exponentialRampToValueAtTime(recipe.endHz, now + recipe.duration)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(recipe.peakGain, now + Math.min(0.025, recipe.duration / 3))
      gain.gain.exponentialRampToValueAtTime(0.0001, now + recipe.duration)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(now)
      oscillator.stop(now + recipe.duration)
      return true
    } catch {
      return false
    }
  }

  /** Close the lazily created browser audio context, when one exists. */
  async dispose(): Promise<void> {
    for (const media of this.media) media.pause?.()
    this.media = []
    const context = this.context
    this.context = undefined
    if (context !== undefined && context.state !== 'closed') await context.close()
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    soulAudio: SoulAudioRuntime
  }
}

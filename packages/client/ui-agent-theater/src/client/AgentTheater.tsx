/** Session dock Adapter over the pure Agent Theater scene and assembly models. */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SoulAudioCue } from '@deepseek-ai/dsh-client-ui-pocket-buddy/client'
import { deriveAssemblyBoard, type AssemblyBoard } from './assembly.ts'
import { deriveAgentScene, type AgentScene } from './scene.ts'
import css from './AgentTheater.module.css'

const SCENE_LABELS: Record<AgentScene, `scene.${AgentScene}`> = {
  idle: 'scene.idle',
  thinking: 'scene.thinking',
  library: 'scene.library',
  terminal: 'scene.terminal',
  workbench: 'scene.workbench',
  web: 'scene.web',
  tools: 'scene.tools',
  approval: 'scene.approval',
  error: 'scene.error',
  done: 'scene.done',
}

const SCENE_SYMBOLS: Record<AgentScene, string> = {
  idle: '…', thinking: '↗', library: '≡', terminal: '>_', workbench: '✎',
  web: '◎', tools: '⚙', approval: '?', error: '!', done: '✓',
}

/** Original whale-girl assembly lane; exact brand copy stays DOM-owned. */
function WhaleBuildLane({ scene, board }: { scene: AgentScene; board: AssemblyBoard }) {
  return (
    <svg className={css.art} viewBox="0 0 590 104" aria-hidden>
      <path className={css.floor} d="M8 91h574" />
      <g className={css.stationBadge}>
        <rect x="12" y="20" width="48" height="46" rx="12" />
        <text x="36" y="49" textAnchor="middle">{SCENE_SYMBOLS[scene]}</text>
      </g>
      <g className={css.whaleGirl}>
        <path className={css.whaleTail} d="M93 21c-10-18-27-14-29 0 9-4 15-1 19 6-7 4-11 10-10 17 12 1 21-6 22-18" />
        <circle className={css.hair} cx="101" cy="35" r="19" />
        <circle className={css.face} cx="104" cy="38" r="14" />
        <path className={css.hairFin} d="M88 27c4-16 18-19 28-8-8 0-14 5-16 13" />
        <circle className={css.ink} cx="99" cy="37" r="1.7" />
        <circle className={css.ink} cx="109" cy="37" r="1.7" />
        <path className={css.inkLine} d="M101 44c3 2 6 2 9-1" />
        <path className={css.body} d="M83 86c3-25 10-35 22-35s20 10 23 35H83Z" />
        <path className={css.finSleeve} d="m89 57-17 13 20 2M119 57l17 14-18 2" />
        <g className={css.hammer}>
          <path className={css.hammerHandle} d="m122 59 20-24" />
          <rect className={css.hammerHead} x="135" y="23" width="27" height="15" rx="5" transform="rotate(-8 148 31)" />
        </g>
      </g>
      <g className={css.rail}>
        <rect x="152" y="74" width="420" height="13" rx="7" />
        <path d="M169 88v8M555 88v8" />
      </g>
      <g className={css.letters}>
        {board.word.split('').map((letter, index) => {
          const visible = index < board.revealed
          const x = 170 + index * 47
          return (
            <g
              key={`${letter}-${index}`}
              className={css.letterTile}
              data-letter-state={visible ? 'visible' : 'hidden'}
              style={{ '--letter-index': index } as CSSProperties}
              transform={`translate(${x} 0)`}
            >
              <rect x="0" y="31" width="38" height="39" rx="9" />
              <text x="19" y="58" textAnchor="middle">{letter}</text>
            </g>
          )
        })}
      </g>
      {board.cheers && (
        <g className={css.toastCup}>
          <path d="M112 60h18l-3 18h-12l-3-18ZM130 64c11-2 11 11 0 10" />
          <path className={css.toastSpark} d="m143 49 3 5 5 3-5 3-3 5-3-5-5-3 5-3 3-5Z" />
        </g>
      )}
    </svg>
  )
}

export interface AgentTheaterInjected {
  playSound: (cue: SoulAudioCue) => void
}

export type AgentTheaterProps = PropsRuntime<'conversation.input.dock'>
  & PropsLocale<'agent-theater'> & AgentTheaterInjected

/** Read primitive live facts and render one selected assembly scene. */
export function AgentTheater({ useSession, t, playSound }: AgentTheaterProps) {
  const running = useSession(snapshot => snapshot.running)
  const pendingCount = useSession(snapshot => snapshot.pending.length)
  const runningToolName = useSession(snapshot => snapshot.runningCalls.at(-1)?.name)
  const hasPartial = useSession(snapshot => snapshot.partial !== null)
  const hasError = useSession(snapshot => snapshot.promptError !== null || snapshot.lastAgentError !== null)
  const [justFinished, setJustFinished] = useState(false)
  const [strikes, setStrikes] = useState(0)
  const finishTimer = useRef<ReturnType<typeof setTimeout> | undefined>()
  const strikeTimer = useRef<ReturnType<typeof setInterval> | undefined>()
  const previousRunning = useRef(running)

  useEffect(() => {
    if (previousRunning.current && !running && pendingCount === 0 && !hasError) {
      setJustFinished(true)
      if (finishTimer.current !== undefined) clearTimeout(finishTimer.current)
      finishTimer.current = setTimeout(() => { setJustFinished(false) }, 2400)
    }
    previousRunning.current = running
    return () => {
      if (finishTimer.current !== undefined) clearTimeout(finishTimer.current)
    }
  }, [hasError, pendingCount, running])

  useEffect(() => {
    if (strikeTimer.current !== undefined) clearInterval(strikeTimer.current)
    strikeTimer.current = undefined
    if (!running) {
      setStrikes(0)
      return
    }
    setStrikes(0)
    strikeTimer.current = setInterval(() => {
      playSound('hammer')
      setStrikes((value) => {
        const next = Math.min(8, value + 1)
        if (next === 8 && strikeTimer.current !== undefined) {
          clearInterval(strikeTimer.current)
          strikeTimer.current = undefined
        }
        return next
      })
    }, 420)
    return () => {
      if (strikeTimer.current !== undefined) clearInterval(strikeTimer.current)
      strikeTimer.current = undefined
    }
  }, [playSound, running])

  useEffect(() => {
    if (hasError) playSound('cheers')
  }, [hasError, playSound])

  const baseScene = deriveAgentScene({
    running, pendingCount, hasPartial, hasError,
    ...(runningToolName === undefined ? {} : { runningToolName }),
  })
  const scene: AgentScene = justFinished && baseScene === 'idle' ? 'done' : baseScene
  const board = deriveAssemblyBoard(scene, strikes)
  return (
    <div
      className={css.root}
      data-agent-theater
      data-scene={scene}
      data-tool={runningToolName}
      data-word={board.word}
      data-built-letters={board.revealed}
    >
      <div className={css.card}>
        <WhaleBuildLane scene={scene} board={board} />
        <div className={css.copy}>
          <span className={css.eyebrow}>{t('label.office')}</span>
          <span className={css.status} role="status">{t(SCENE_LABELS[scene])}</span>
          {board.cheers && <span className={css.cheers}>{t('board.cheers')}</span>}
        </div>
      </div>
    </div>
  )
}

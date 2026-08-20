/** Session-aware 2.5D/3D platform tableaux generated from three original world definitions. */
import { useSyncExternalStore, type ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PlatformWorldRuntime, PlatformWorldStyle } from './worlds.ts'
import css from './PlatformWorlds.module.css'

const STYLE_LABELS: Record<PlatformWorldStyle,
  'style.cloudHarbor' | 'style.candyGears' | 'style.moonCoral'> = {
  'cloud-harbor': 'style.cloudHarbor',
  'candy-gears': 'style.candyGears',
  'moon-coral': 'style.moonCoral',
}

function Runner() {
  return (
    <g data-world-runner="" transform="translate(244 304)">
      <g className={css.runnerMotion}>
        <ellipse className={css.runnerShadow} cx="0" cy="19" rx="22" ry="6" />
        <path className={css.runnerScarf} d="M-12-7c-18 2-23-6-28-15 13 5 22 4 31-2" />
        <path className={css.runnerBody} d="M-19 5c0-24 8-36 21-36S24-18 24 5c0 12-9 18-22 18S-19 17-19 5Z" />
        <path className={css.runnerAntenna} d="M3-30c0-9 6-14 13-16" />
        <circle className={css.runnerSpark} cx="18" cy="-48" r="5" />
        <circle className={css.runnerEye} cx="-4" cy="-8" r="2.7" />
        <circle className={css.runnerEye} cx="9" cy="-8" r="2.7" />
        <path className={css.runnerSmile} d="M-1 1c4 4 8 4 12 0" />
        <path className={css.runnerFoot} d="M-13 18c-7 1-11 5-12 9 8 3 15 2 21-4M15 18c8 0 13 3 15 7-7 4-15 4-23-1" />
      </g>
    </g>
  )
}

function CloudHarbor() {
  return (
    <svg data-world-art="cloud-harbor" className={css.worldArt} viewBox="0 0 960 430" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <rect className={css.cloudSky} width="960" height="430" />
      <circle className={css.cloudSun} cx="790" cy="92" r="51" />
      <g className={css.farClouds}>
        <path d="M20 134c28-46 87-31 91 11 26-31 79-13 76 31H16c-15-17-8-36 4-42ZM652 152c25-39 72-31 83 4 24-24 65-8 65 24H629c-6-16 4-27 23-28Z" />
      </g>
      <g className={css.cloudSails}>
        <path d="M120 64v102M123 70c45 10 61 42 64 74-33-7-55-26-64-52M716 39v117M719 48c50 16 66 50 65 82-35-6-57-27-65-58" />
      </g>
      <g className={css.cloudIsland}>
        <path d="M25 331c22-47 65-53 106-26 30-39 93-30 106 15h93l-26 44H54Z" />
        <path className={css.cloudIslandTop} d="M27 329c48-14 104-17 207-9l96 0-12 20H39Z" />
      </g>
      <g className={css.cloudIsland} transform="translate(410 -32)">
        <path d="M0 331c26-44 67-50 105-24 25-27 74-22 89 13h114l-25 44H32Z" />
        <path className={css.cloudIslandTop} d="M4 328c62-13 142-13 304-8l-13 20H18Z" />
      </g>
      <g className={css.cloudIsland} transform="translate(742 18) scale(.78)">
        <path d="M0 331c26-44 67-50 105-24 25-27 74-22 89 13h114l-25 44H32Z" />
        <path className={css.cloudIslandTop} d="M4 328c62-13 142-13 304-8l-13 20H18Z" />
      </g>
      <g className={css.harborPosts}>
        <path d="M87 278v55M172 274v52M480 245v57M600 246v55" />
        <path className={css.rope} d="M87 288c29 20 57 17 85-4M480 256c42 24 80 23 120-3" />
      </g>
      <g transform="translate(360 246)">
        <g className={css.collectibleFloat}>
          <path className={css.windBell} d="M0-20c14 0 23 10 23 25H-23c0-15 9-25 23-25ZM-27 5h54M0 5v16" />
          <circle className={css.windBellClapper} cx="0" cy="25" r="6" />
        </g>
      </g>
      <g className={css.cloudBirds}><path d="M542 109c8-9 16-9 24 0 8-9 16-9 24 0M297 88c6-7 12-7 18 0 6-7 12-7 18 0" /></g>
      <Runner />
    </svg>
  )
}

function CandyGears() {
  return (
    <svg data-world-art="candy-gears" className={css.worldArt} viewBox="0 0 960 430" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <rect className={css.candySky} width="960" height="430" />
      <g className={css.candyGrid}>
        <path d="M0 320 480 92l480 228-480 110ZM0 363l480-229 480 229M120 430 580 210M336 430 694 259M624 430 815 338M840 430l74-35M840 263 480 430M692 193 225 414M559 132 0 398" />
      </g>
      <g className={css.candyTowers}>
        <path d="M86 279V133l50-26 50 26v146Z" />
        <path className={css.candyTowerSide} d="m136 107 50 26v146l-50 27Z" />
        <path className={css.candyTowerTop} d="m86 133 50-26 50 26-50 27Z" />
        <path d="M718 287V92l61-31 61 31v195Z" />
        <path className={css.candyTowerSide} d="m779 61 61 31v195l-61 31Z" />
        <path className={css.candyTowerTop} d="m718 92 61-31 61 31-61 33Z" />
      </g>
      <g className={css.gears}>
        <g transform="translate(164 213)"><g className={css.gearSpin}><path d="m0-45 10 13 16-7 3 17 17 3-7 16L52 7 39 20l7 16-17 3-3 17-16-7L0 62-10 49l-16 7-3-17-17-3 7-16L-52 7l13-10-7-16 17-3 3-17 16 7Z" /><circle cx="0" cy="7" r="20" /></g></g>
        <g transform="translate(770 222) scale(.72)"><g className={css.gearSpinReverse}><path d="m0-45 10 13 16-7 3 17 17 3-7 16L52 7 39 20l7 16-17 3-3 17-16-7L0 62-10 49l-16 7-3-17-17-3 7-16L-52 7l13-10-7-16 17-3 3-17 16 7Z" /><circle cx="0" cy="7" r="20" /></g></g>
      </g>
      <g className={css.isoPlatforms}>
        <g transform="translate(22 0)"><path className={css.isoFront} d="m0 323 233 0v45L0 368Z" /><path className={css.isoTop} d="m0 323 81-40 234 0-82 40Z" /><path className={css.isoSide} d="m233 323 82-40v43l-82 42Z" /></g>
        <g transform="translate(368 -31)"><path className={css.isoFront} d="m0 323 234 0v45L0 368Z" /><path className={css.isoTop} d="m0 323 81-40 234 0-81 40Z" /><path className={css.isoSide} d="m234 323 81-40v43l-81 42Z" /></g>
        <g transform="translate(716 11) scale(.78)"><path className={css.isoFront} d="m0 323 234 0v45L0 368Z" /><path className={css.isoTop} d="m0 323 81-40 234 0-81 40Z" /><path className={css.isoSide} d="m234 323 81-40v43l-81 42Z" /></g>
      </g>
      <g transform="translate(652 226)"><g className={css.collectibleFloat}>
        <path className={css.sugarSpark} d="m0-24 9 16 18 8-18 9-9 18-9-18-18-9 18-8Z" />
        <circle className={css.sugarSparkCore} r="6" />
      </g></g>
      <g className={css.pipeCandy}><path d="M342 283v-76h40v76M332 206h60v20h-60ZM621 254v-64h36v64M612 189h54v18h-54Z" /></g>
      <Runner />
    </svg>
  )
}

function MoonCoral() {
  return (
    <svg data-world-art="moon-coral" className={css.worldArt} viewBox="0 0 960 430" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <rect className={css.moonSea} width="960" height="430" />
      <circle className={css.moonGlow} cx="770" cy="78" r="54" />
      <path className={css.moonRay} d="m712 0-74 430h249L814 0Z" />
      <g className={css.bubbles}>
        <circle cx="97" cy="111" r="8" /><circle cx="118" cy="81" r="4" /><circle cx="686" cy="177" r="7" /><circle cx="714" cy="143" r="4" /><circle cx="872" cy="222" r="9" />
      </g>
      <g className={css.coralBack}>
        <path d="M33 356c2-66 10-105 29-119-4 31-3 50 3 58 12-35 26-54 43-62-16 41-19 79-8 123M829 360c1-77 11-126 32-148-7 38-6 65 3 79 13-42 29-67 49-75-17 44-21 93-13 144" />
      </g>
      <g className={css.coralPlatforms}>
        <path d="M0 333c58-14 126-17 267-7l27 27-36 31H0Z" />
        <path className={css.coralTop} d="M0 331c90-19 188-17 267-5l27 27c-99-12-194-12-294 2Z" />
        <path d="M365 304c91-18 183-18 275-4l28 28-35 34H382l-38-29Z" />
        <path className={css.coralTop} d="M365 302c91-18 183-17 275-2l28 28c-106-13-201-12-306 3Z" />
        <path d="M747 340c75-17 146-14 213-4v94H769l-38-55Z" />
        <path className={css.coralTop} d="M747 338c75-17 146-14 213-4v34c-77-8-140-8-213 5Z" />
      </g>
      <g className={css.coralPlants}>
        <path d="M104 331c0-45-18-54-25-76 28 8 37 32 34 53 9-31 28-51 51-57-19 24-28 51-23 80M535 302c0-38-16-51-23-73 25 8 35 29 32 49 10-30 29-49 49-53-15 22-21 47-17 77" />
      </g>
      <g className={css.jellyfish} transform="translate(327 135)">
        <path d="M-28 0c0-38 56-38 56 0-18 12-38 12-56 0Z" />
        <path className={css.jellyTails} d="M-20 4c-7 26 11 24 3 49M0 8c-8 26 10 25 1 51M19 4c-7 23 10 25 1 47" />
      </g>
      <g transform="translate(700 263)"><g className={css.collectibleFloat}>
        <path className={css.shell} d="M-27 13c0-29 54-40 54 0 0 13-12 20-27 20s-27-7-27-20Z" />
        <path className={css.shellLine} d="M-17 21C-12 2-6-7 0-10M0-10c7 8 13 18 17 31" />
        <circle className={css.moonPearl} cy="13" r="9" />
      </g></g>
      <g className={css.fish}><path d="M580 128c28-21 54-15 74 2-20 20-47 23-74 2l-19 15 4-31ZM189 185c20-15 40-11 54 2-15 14-35 16-54 1l-14 11 3-23Z" /></g>
      <Runner />
    </svg>
  )
}

const WORLD_ART: Record<PlatformWorldStyle, () => ReactNode> = {
  'cloud-harbor': CloudHarbor,
  'candy-gears': CandyGears,
  'moon-coral': MoonCoral,
}

export interface PlatformWorldBackdropInjected {
  worlds: PlatformWorldRuntime
}

export type PlatformWorldBackdropProps = PropsRuntime<'conversation.viewport.background'>
  & PropsLocale<'platform-worlds'> & PlatformWorldBackdropInjected

/** Render one world at a time; task state only animates the runner and world mechanisms. */
export function PlatformWorldBackdrop({ useSession, worlds, t }: PlatformWorldBackdropProps) {
  const running = useSession(snapshot => snapshot.running)
  const { style } = useSyncExternalStore(worlds.subscribe, worlds.getSnapshot, worlds.getSnapshot)
  const Artwork = WORLD_ART[style]
  return (
    <section
      className={css.backdrop}
      data-platform-world=""
      data-style={style}
      data-running={running ? 'true' : 'false'}
      aria-label={`${t(STYLE_LABELS[style])} · ${t(running ? 'status.running' : 'status.idle')}`}
    >
      <Artwork />
      <div className={css.worldLabel}>
        <span className={css.worldDot} aria-hidden />
        <span>{t(STYLE_LABELS[style])}</span>
      </div>
    </section>
  )
}

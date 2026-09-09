/** Pure renderers over validated task-owned data. Local filters never alter logged evidence. */
import { useId, useMemo, useRef, useState, type ReactNode } from 'react'
import type { z } from 'zod'
import type { documentSchema, sectionSchema } from './schema.mjs'
import type { Translate } from './locales.ts'
import { documentText } from './document-text.mjs'

export type Document = z.infer<typeof documentSchema>
type Section = z.infer<typeof sectionSchema>
const palette = ['#468efd', '#8db9ef', '#315fc8', '#75a9bc', '#b9cef4', '#677990']
const display = (value: unknown) => value === null ? '—' : String(value)

function Chart({ section: s, t }: { section: Extract<Section, { type: 'chart' }>; t: Translate }) {
  const [style, setStyle] = useState(s.chart)
  const [metric, setMetric] = useState('all')
  const uid = useId()
  const shown = s.series.filter(series => metric === 'all' || series.name === metric)
  const values = shown.flatMap(series => series.values)
  const min = Math.min(0, ...values), max = Math.max(1, ...values)
  const x = (index: number) => 42 + (index + .5) * 608 / s.labels.length
  const y = (value: number) => 207 - (value - min) / (max - min) * 170
  return <>
    <div className="gu-toolbar"><select aria-label={t('metric')} value={metric} onChange={e => setMetric(e.target.value)}><option value="all">{t('all')}</option>{s.series.map(series => <option key={series.name}>{series.name}</option>)}</select><div role="group" aria-label={t('chartType')}>{(['bar', 'line', 'area'] as const).map(value => <button key={value} aria-pressed={style === value} onClick={() => setStyle(value)}>{t(value)}</button>)}</div></div>
    <svg className="gu-chart" viewBox="0 0 690 250" role="img" aria-label={`${s.title}: ${shown.map(series => `${series.name} ${series.values.join(', ')}`).join('; ')}`}>
      {[0, 1, 2, 3, 4].map(i => { const value = min + (max - min) * i / 4; return <g key={i}><line x1="42" x2="664" y1={y(value)} y2={y(value)} stroke="currentColor" opacity=".12" /><text x="34" y={y(value) + 4} textAnchor="end">{new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)}</text></g> })}
      {shown.map((series, si) => { const points = series.values.map((v, i) => `${x(i)},${y(v)}`).join(' '); const color = palette[s.series.indexOf(series) % palette.length]; return <g key={series.name}>
        {style === 'bar' ? series.values.map((v, i) => <rect key={i} x={x(i) - 240 / s.labels.length + si * 480 / s.labels.length / shown.length} y={Math.min(y(v), y(0))} width={Math.max(1, 440 / s.labels.length / shown.length)} height={Math.max(1, Math.abs(y(v) - y(0)))} rx="3" fill={color}><title>{`${s.labels[i]} · ${series.name}: ${v}`}</title></rect>) : <>
          {style === 'area' ? <><defs><linearGradient id={`${uid}-${si}`} x1="0" x2="0" y1="0" y2="1"><stop stopColor={color} stopOpacity=".3" /><stop offset="1" stopColor={color} stopOpacity=".03" /></linearGradient></defs><polygon points={`${x(0)},${y(0)} ${points} ${x(series.values.length - 1)},${y(0)}`} fill={`url(#${uid}-${si})`} /></> : null}
          <polyline points={points} fill="none" stroke={color} strokeWidth="2.8" strokeLinejoin="round" />{series.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill={color}><title>{`${s.labels[i]} · ${series.name}: ${v}`}</title></circle>)}
        </>}
      </g> })}
      {s.labels.map((label, i) => i % Math.max(1, Math.ceil(s.labels.length / 10)) === 0 ? <text key={i} x={x(i)} y="238" textAnchor="middle">{label}</text> : null)}
    </svg><div className="gu-legend">{shown.map(series => <span key={series.name}><i style={{ background: palette[s.series.indexOf(series) % palette.length] }} />{series.name}</span>)}{s.unit ? <small>{s.unit}</small> : null}</div>
  </>
}

function DataTable({ section: s, t }: { section: Extract<Section, { type: 'table' }>; t: Translate }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: string; direction: number } | null>(null)
  const rows = useMemo(() => {
    const filtered = s.rows.filter(row => s.columns.some(c => display(row[c.key] ?? '').toLocaleLowerCase().includes(query.toLocaleLowerCase())))
    if (!sort) return filtered
    return [...filtered].sort((a, b) => { const x = a[sort.key], y = b[sort.key]; return sort.direction * (typeof x === 'number' && typeof y === 'number' ? x - y : display(x).localeCompare(display(y))) })
  }, [s, query, sort])
  return <><input className="gu-search" aria-label={t('filter')} placeholder={t('filter')} value={query} onChange={e => setQuery(e.target.value)} /><div className="gu-table-scroll"><table><thead><tr>{s.columns.map(c => <th key={c.key} aria-sort={sort?.key === c.key ? sort.direction === 1 ? 'ascending' : 'descending' : 'none'}><button onClick={() => setSort({ key: c.key, direction: sort?.key === c.key ? -sort.direction : 1 })}>{c.label}{sort?.key === c.key ? sort.direction === 1 ? ' ↑' : ' ↓' : ' ↕'}</button></th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{s.columns.map(c => <td key={c.key}>{display(row[c.key] ?? null)}</td>)}</tr>)}</tbody></table>{rows.length === 0 ? <p>{t('noRows')}</p> : null}</div></>
}

function Products({ section: s, t }: { section: Extract<Section, { type: 'products' }>; t: Translate }) {
  const [available, setAvailable] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  return <><label className="gu-check"><input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} />{t('available')}</label><div className="gu-products">{s.items.filter(item => !available || item.available).map((item, index) => <article key={item.id}><div className={`gu-product-art gu-art-${index % 3}`} aria-hidden="true">{['◉', '▦', '◒'][index % 3]}</div><h4>{item.name}</h4><p>{item.description}</p><strong>{item.currency} {item.price.toLocaleString()}</strong>{item.rating !== undefined ? <small>★ {item.rating}</small> : null}<button aria-pressed={selected.includes(item.id)} onClick={() => setSelected(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])}>{t(selected.includes(item.id) ? 'compared' : 'compare')}</button></article>)}</div></>
}

function DocumentBody({ section: s, t }: { section: Extract<Section, { type: 'document' }>; t: Translate }) {
  const content = documentText(s)
  return <div className="gu-manuscript">
    <div className="gu-filebar"><span className="gu-file-icon" aria-hidden="true">≡</span><div><strong>{s.filename}</strong><small>Markdown · {t('document')}</small></div><a className="gu-download" href={`data:text/markdown;charset=utf-8,${encodeURIComponent(content)}`} download={s.filename}>{t('download')} ↓</a></div>
    {s.summary ? <p className="gu-abstract">{s.summary}</p> : null}
    {s.content.map((part, i) => <section key={i}><h4><span>{String(i + 1).padStart(2, '0')}</span>{part.heading}</h4>{part.paragraphs.map((paragraph, j) => <p key={j}>{paragraph}</p>)}{part.bullets?.length ? <ul>{part.bullets.map((item, j) => <li key={j}>{item}</li>)}</ul> : null}</section>)}
  </div>
}

function SectionBody({ section: s, t }: { section: Section; t: Translate }): ReactNode {
  switch (s.type) {
    case 'document': return <DocumentBody section={s} t={t} />
    case 'metrics': return <div className="gu-metrics">{s.items.map((item, i) => <div key={i} data-tone={item.tone}><small>{item.label}</small><strong>{display(item.value)}<em>{item.unit}</em></strong>{item.change ? <span>{item.change}</span> : null}</div>)}</div>
    case 'chart': return <Chart section={s} t={t} />
    case 'table': return <DataTable section={s} t={t} />
    case 'progress': return <div className="gu-progress-list">{s.items.map((item, i) => <div key={i} data-tone={item.tone}><div><span>{item.label}</span><strong>{Math.round(item.value / item.total * 100)}%</strong></div><progress max={item.total} value={item.value} aria-label={item.label} /><small>{item.status} · {item.value} / {item.total}</small></div>)}</div>
    case 'timeline': return <ol className="gu-timeline">{s.items.map((item, i) => <li key={i} data-state={item.status}><span className="gu-timeline-dot" /><div><small>{item.time} · {t(item.status)}</small><h4>{item.title}</h4><p>{item.detail}</p></div></li>)}</ol>
    case 'callout': return <div className="gu-callout" data-tone={s.tone}><p>{s.body}</p></div>
    case 'facts': return <dl className="gu-facts">{s.items.map((item, i) => <div key={i}><dt>{item.label}</dt><dd>{display(item.value)}</dd></div>)}</dl>
    case 'list': return <ul className="gu-findings">{s.items.map((item, i) => <li key={i} data-tone={item.tone}><div><h4>{item.title}</h4>{item.status ? <span>{item.status}</span> : null}</div>{item.detail ? <p>{item.detail}</p> : null}</li>)}</ul>
    case 'artifacts': return <ul className="gu-artifacts">{s.items.map((item, i) => <li key={i}><a href={item.url} target="_blank" rel="noreferrer">{item.label} ↗</a><p>{item.description}</p></li>)}</ul>
    case 'weather': return <Weather section={s} t={t} />
    case 'stock': return <div className="gu-stock"><small>{s.symbol}</small><strong>{s.currency} {s.price.toLocaleString()}</strong><span data-tone={s.changePercent >= 0 ? 'success' : 'danger'}>{s.changePercent > 0 ? '+' : ''}{s.changePercent}%</span><Chart section={{ id: s.id, type: 'chart', title: s.title, chart: 'area', labels: s.history.map((_, i) => String(i + 1)), series: [{ name: s.symbol, values: s.history }] }} t={t} /></div>
    case 'products': return <Products section={s} t={t} />
  }
  const unknown: never = s
  throw new Error(`Unknown result section: ${String(unknown)}`)
}

function Weather({ section: s, t }: { section: Extract<Section, { type: 'weather' }>; t: Translate }) {
  const [fahrenheit, setFahrenheit] = useState(false)
  const temperature = (value: number) => Math.round(fahrenheit ? value * 9 / 5 + 32 : value)
  return <div className="gu-weather"><div className="gu-toolbar"><h4>{s.location}</h4><div><button aria-pressed={!fahrenheit} onClick={() => setFahrenheit(false)}>°C</button><button aria-pressed={fahrenheit} onClick={() => setFahrenheit(true)}>°F</button></div></div><div className="gu-weather-main"><strong>{temperature(s.celsius)}°</strong><span aria-hidden="true">☀</span></div><p>{s.condition}</p><div className="gu-weather-stats"><span>{t('humidity')} {s.humidity}%</span><span>{t('wind')} {s.windKph} km/h</span></div><div className="gu-forecast" aria-label={t('forecast')}>{s.forecast.map((day, i) => <div key={i}><small>{day.label}</small><strong>{temperature(day.celsius)}°</strong></div>)}</div></div>
}

/** Display any validated report or dashboard; an expanded view uses the same data and renderers. */
export function ResultDocument({ document: doc, t, expanded = false }: { document: Document; t: Translate; expanded?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  return <article className={`gu-document gu-${doc.layout}`} data-document-id={doc.id}>
    <header className="gu-document-header"><div><span className="gu-badge">{t(doc.dataMode)}</span><h2>{doc.title}</h2>{doc.description ? <p>{doc.description}</p> : null}</div>{!expanded ? <button onClick={() => dialog.current?.showModal()}>{t('expand')} ↗</button> : null}</header>
    <div className="gu-sections">{doc.sections.map(s => <section key={s.id} className={`gu-section gu-type-${s.type}`} data-span={s.span ?? (s.type === 'metrics' || s.type === 'table' || s.type === 'document' ? 'full' : 'half')}><h3>{s.title}</h3><SectionBody section={s} t={t} />{s.source ? <footer>{t('source')}: {s.source}</footer> : null}</section>)}</div>
    {!expanded ? <dialog ref={dialog} className="gu-dialog" aria-label={doc.title}><div className="gu-dialog-top"><span>{doc.title}</span><button onClick={() => dialog.current?.close()}>{t('close')} ×</button></div><ResultDocument document={doc} t={t} expanded /></dialog> : null}
  </article>
}

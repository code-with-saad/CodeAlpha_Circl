import { useEffect, useRef, useState } from 'react'

import { fmt, fmtDay } from './format'

function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

// Pick an axis top so the grid lines land on friendly numbers.
function niceMax(n) {
  // Four equal gaps with whole-number steps of 1, 2 or 5 times a power of ten (so ticks read 0, 10, 20, 30, 40).
  for (let mag = 1; ; mag *= 10) {
    for (const s of [1, 2, 5]) if (s * mag * 4 >= n) return s * mag * 4
  }
}

/**
 * Multi-series area chart. Hover, touch or use the arrow keys to read exact values for a day.
 * series: [{ key, label, color, values }]; `summary` becomes the accessible description.
 */
export function AreaChart({ labels, series, summary, height = 250 }) {
  const [wrap, width] = useWidth()
  const [rawHover, setHover] = useState(null)
  const w = Math.max(width, 260)
  const pad = { l: 38, r: 14, t: 14, b: 28 }
  const iw = w - pad.l - pad.r
  const ih = height - pad.t - pad.b
  const n = labels.length
  // The range can change while a point is highlighted; ignore an index that no longer exists.
  const hover = rawHover !== null && rawHover < n ? rawHover : null
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)))
  const x = (i) => pad.l + (n <= 1 ? iw / 2 : (i * iw) / (n - 1))
  const y = (v) => pad.t + ih - (v / max) * ih
  const line = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const area = (vals) => `${line(vals)}L${x(n - 1).toFixed(1)},${pad.t + ih}L${x(0).toFixed(1)},${pad.t + ih}Z`
  const ticks = [...new Set([0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t)))]
  const xTicks = n <= 8 ? labels.map((_, i) => i) : [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(t * (n - 1)))

  const at = (clientX, rect) => {
    const i = Math.round(((clientX - rect.left - pad.l) / iw) * (n - 1))
    return Math.min(n - 1, Math.max(0, i))
  }
  const onKey = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setHover((h) => Math.max(0, (h ?? n) - 1)) }
    if (e.key === 'ArrowRight') { e.preventDefault(); setHover((h) => Math.min(n - 1, (h ?? -1) + 1)) }
    if (e.key === 'Escape') setHover(null)
  }

  const tipLeft = hover === null ? 0 : Math.min(Math.max(x(hover), 90), w - 90)
  return (
    <div className="chart" ref={wrap} style={{ height }}>
      {width > 0 && (
        <>
          <svg
            width={w} height={height} role="img" aria-label={summary} tabIndex={0}
            onPointerMove={(e) => setHover(at(e.clientX, e.currentTarget.getBoundingClientRect()))}
            onPointerLeave={() => setHover(null)}
            onKeyDown={onKey}
            onBlur={() => setHover(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} className="chart-grid" />
                <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="chart-axis">{fmt(t)}</text>
              </g>
            ))}
            {xTicks.map((i) => (
              <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="chart-axis">{fmtDay(labels[i])}</text>
            ))}
            {series.map((s) => (
              <g key={s.key}>
                <path d={area(s.values)} fill={s.color} opacity="0.12" />
                <path d={line(s.values)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              </g>
            ))}
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} className="chart-guide" />
                {series.map((s) => <circle key={s.key} cx={x(hover)} cy={y(s.values[hover])} r="4" fill="var(--surface)" stroke={s.color} strokeWidth="2" />)}
              </g>
            )}
          </svg>
          {hover !== null && (
            <div className="chart-tip" style={{ left: tipLeft }} role="status">
              <strong>{fmtDay(labels[hover])}</strong>
              {series.map((s) => (
                <span key={s.key}><i style={{ background: s.color }} />{s.label} <b>{fmt(s.values[hover])}</b></span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function Sparkline({ values, color }) {
  const w = 96, h = 30
  const max = Math.max(1, ...values)
  const pts = values.map((v, i) => `${((i / Math.max(1, values.length - 1)) * w).toFixed(1)},${(h - 3 - (v / max) * (h - 6)).toFixed(1)}`)
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/** One bar split into labelled parts, with a legend that shows counts and shares. */
export function StackedBar({ parts, label }) {
  const total = parts.reduce((a, p) => a + p.value, 0)
  return (
    <div>
      <div className="stack" role="img" aria-label={label}>
        {total === 0 && <span className="stack-empty" />}
        {parts.filter((p) => p.value > 0).map((p) => (
          <span key={p.key} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${p.value}`} />
        ))}
      </div>
      <ul className="legend">
        {parts.map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} aria-hidden="true" />
            <span>{p.label}</span>
            <b>{fmt(p.value)}</b>
            <span className="muted-sm">{total ? Math.round((p.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BarList({ items, color = 'var(--accent)', empty }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  if (!items.length) return <p className="adm-empty">{empty}</p>
  return (
    <ul className="bars">
      {items.map((i) => (
        <li key={i.label}>
          <span className="bars-label">{i.label}</span>
          <span className="bars-track"><span style={{ width: `${(i.value / max) * 100}%`, background: color }} /></span>
          <b>{fmt(i.value)}</b>
        </li>
      ))}
    </ul>
  )
}

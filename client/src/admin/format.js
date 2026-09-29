const nf = new Intl.NumberFormat()
export const fmt = (n) => nf.format(n)
export const fmtDay = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })

const nf = (max: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: max })

/** Mass in kg, switching to tonnes above 1000 kg. */
export function formatMass(kg: number): { value: string; unit: string } {
  const abs = Math.abs(kg)
  if (abs >= 1000) return { value: nf(2).format(kg / 1000), unit: "t" }
  if (abs >= 100) return { value: nf(0).format(kg), unit: "kg" }
  if (abs >= 1) return { value: nf(1).format(kg), unit: "kg" }
  if (abs === 0) return { value: "0", unit: "kg" }
  return { value: nf(0).format(kg * 1000), unit: "g" }
}

export function massText(kg: number): string {
  const m = formatMass(kg)
  return `${m.value} ${m.unit}`
}

export function fmt(n: number | null | undefined, digits = 1): string {
  return n === null || n === undefined ? "–" : nf(digits).format(n)
}

export function timeAgo(isoTime: string | null, now = Date.now()): string {
  if (!isoTime) return "never"
  const s = Math.max(0, Math.round((now - Date.parse(isoTime)) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86_400)} d ago`
}

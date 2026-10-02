"use client"

import { useState } from "react"
import { Brain, Camera, Cloud, Cpu, Wind } from "lucide-react"

type Module = {
  key: string
  icon: typeof Cpu
  name: string
  tagline: string
  role: string
  parts: [string, string, string][] // part, measures, pin
  specs: [string, string][]
  firmware: string[]
}

const MODULES: Module[] = [
  {
    key: "tree",
    icon: Cpu,
    name: "Tree module",
    tagline: "The tree's health monitor",
    role: "Sits at the base of your tree and checks every 5 seconds whether it has what it needs to grow.",
    parts: [
      ["ESP32 DevKit", "Brain + Wi-Fi", "—"],
      ["SHT31 in radiation shield", "Air temperature, humidity", "I2C · 21/22"],
      ["Capacitive soil probe", "Soil moisture %", "GPIO 34"],
      ["PH-4502C + probe", "Soil pH", "GPIO 35"],
      ["LDR divider", "Sunlight %", "GPIO 32"],
    ],
    specs: [["Sampling", "every 5 s"], ["Upload", "1-min averages"], ["Offline buffer", "6 hours"], ["Flash use", "81%"]],
    firmware: ["Median-of-9 ADC filtering", "Two-point pH calibration (pH 4 & 7)", "Dry/wet soil calibration via serial `cal`", "ADC1 pins only (Wi-Fi safe)"],
  },
  {
    key: "camera",
    icon: Camera,
    name: "Leaf camera",
    tagline: "A daily canopy selfie",
    role: "An ESP32-CAM pointed at the canopy. It wakes every 2 hours in the 10:00 to 15:00 window, takes one photo and sleeps again.",
    parts: [
      ["AI-Thinker ESP32-CAM", "VGA JPEG capture", "—"],
      ["OV2640 sensor", "Daylight-locked white balance", "built-in"],
    ],
    specs: [["Captures", "10:00–15:00 IST"], ["Interval", "2 h deep sleep"], ["Frame", "640×480"], ["On-device AI", "none, saves battery"]],
    firmware: ["Discards 4 frames so exposure settles", "Uploads raw JPEG over HTTPS", "Image analysed on the server, then deleted", "Leaf colour = indicative care signal"],
  },
  {
    key: "air",
    icon: Wind,
    name: "Air module",
    tagline: "What your family breathes",
    role: "Watches fine dust and an indicative CO₂ trend near your home and parking spot, so you know when to keep windows shut.",
    parts: [
      ["ESP32 DevKit", "Brain + Wi-Fi", "—"],
      ["Sharp GP2Y1010AU0F", "PM2.5 dust density", "GPIO 35 / LED 25"],
      ["MQ135", "CO₂ trend (indicative)", "GPIO 34"],
      ["SHT31 (optional)", "Ambient temp, humidity", "I2C · 21/22"],
    ],
    specs: [["Sampling", "every 2 s"], ["Warm-up", "3 min (MQ135)"], ["Limits", "WHO 15 · NAAQS 60"], ["Score impact", "none (ambient)"]],
    firmware: ["Datasheet 0.28 ms LED-pulse timing", "R0 calibrated in clean air at 420 ppm", "Calibration stored in flash", "Vehicle CO₂ counted from fuel, not this sensor"],
  },
  {
    key: "cloud",
    icon: Cloud,
    name: "Cloud & engine",
    tagline: "Where readings become decisions",
    role: "A Next.js REST API stores every reading in PostgreSQL and recalculates your carbon balance, Green Score and tips on every refresh.",
    parts: [
      ["REST API", "13 endpoints, per-device keys", "Next.js 15"],
      ["PostgreSQL", "7 tables, append-only history", "Supabase / any"],
      ["Carbon engine", "Chave growth, IPCC/CEA factors", "TypeScript"],
      ["Plausibility checks", "Night light, flat temperature", "24 h window"],
    ],
    specs: [["Dashboard refresh", "10 s"], ["Batch size", "≤ 200 readings"], ["Key storage", "SHA-256 hash"], ["Duplicate uploads", "ignored"]],
    firmware: ["Range validation on every field", "Backdated or future measurements neutralised", "Growth capped at 3× the species' normal rate", "Bills spread over their billing period"],
  },
  {
    key: "ml",
    icon: Brain,
    name: "Bark AI",
    tagline: "Which tree is this?",
    role: "Snap the bark with your phone. A ResNet50 suggests the species and you confirm it.",
    parts: [
      ["ResNet50 (PyTorch)", "13 tree species", "Flask server"],
      ["Leaf-colour analysis", "Green ratio, VARI, coverage", "NumPy"],
    ],
    specs: [["Validation accuracy", "88.3%"], ["Output", "top-3 + confidence"], ["Runtime", "CPU-only"], ["Images stored", "never"]],
    firmware: ["Trained on BarkVisionAI bark images", "Suggestion only; the household confirms", "Rejects frames with < 15% foliage", "Same ImageNet normalisation as training"],
  },
]

export function BuildExplorer() {
  const [active, setActive] = useState(MODULES[0].key)
  const m = MODULES.find((x) => x.key === active)!
  const Icon = m.icon
  return (
    <div className="panel overflow-hidden">
      <div role="tablist" aria-label="System modules" className="flex gap-1 overflow-x-auto border-b border-border p-2">
        {MODULES.map((x) => {
          const I = x.icon
          const on = x.key === active
          return (
            <button
              key={x.key}
              role="tab"
              aria-selected={on}
              onClick={() => setActive(x.key)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors ${on ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              <I className="h-4 w-4" /> {x.name}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" key={m.key} className="grid gap-8 p-6 md:p-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Icon className="h-6 w-6" />
          </span>
          <p className="eyebrow mt-5 text-primary">{m.tagline}</p>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight">{m.name}</h3>
          <p className="mt-3 text-muted-foreground">{m.role}</p>
          <dl className="mt-6 grid grid-cols-2 gap-2">
            {m.specs.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-secondary/70 p-3">
                <dt className="text-[11px] text-muted-foreground">{k}</dt>
                <dd className="num mt-0.5 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-500">
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Component</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Pin / stack</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {m.parts.map(([a, b, c]) => (
                  <tr key={a}>
                    <td className="px-4 py-2.5 font-medium">{a}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{b}</td>
                    <td className="num px-4 py-2.5 text-xs text-muted-foreground">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {m.firmware.map((f) => (
              <li key={f} className="flex items-start gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-muted-foreground">{f.split("`").map((t, i) => (i % 2 ? <code key={i} className="text-foreground">{t}</code> : t))}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

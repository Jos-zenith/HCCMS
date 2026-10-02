import { CloudOff, Droplets, Leaf, Receipt, RefreshCw, Trophy, Wind } from "lucide-react"
import { Reveal } from "./motion"

const EVENTS = [
  {
    time: "06:10",
    icon: Droplets,
    tone: "text-teal-300 bg-teal-300/10",
    title: "Soil is drying out",
    body: "The tree module reads 18% soil moisture. Your dashboard says: water the neem now, before the heat.",
    tag: "Tree module · capacitive probe",
  },
  {
    time: "11:30",
    icon: Leaf,
    tone: "text-primary bg-primary/10",
    title: "Canopy check-up",
    body: "The leaf camera wakes, snaps the canopy in steady midday light and goes back to sleep. 94% green foliage, looking healthy.",
    tag: "ESP32-CAM · server-side analysis",
  },
  {
    time: "14:05",
    icon: Wind,
    tone: "text-warning bg-warning/10",
    title: "Bad air on your street",
    body: "PM2.5 climbs past India's 60 µg/m³ standard. You get a heads-up to keep the kids indoors and windows shut.",
    tag: "Air module · GP2Y1010 dust sensor",
  },
  {
    time: "20:40",
    icon: CloudOff,
    tone: "text-muted-foreground bg-muted",
    title: "Wi-Fi drops",
    body: "No problem. Every module keeps up to 6 hours of readings in memory, each with its exact time.",
    tag: "Firmware · offline ring buffer",
  },
  {
    time: "21:15",
    icon: RefreshCw,
    tone: "text-teal-300 bg-teal-300/10",
    title: "Back online, nothing lost",
    body: "35 buffered readings upload in one batch. Duplicates are ignored, so retries never double count.",
    tag: "REST API · idempotent ingest",
  },
  {
    time: "Month end",
    icon: Receipt,
    tone: "text-gold bg-gold/10",
    title: "Log the TNEB bill",
    body: "Type 212 units. HCCMS converts it to 152 kg CO₂ and puts it next to what your trees grew this month.",
    tag: "CEA grid factor · 0.716 kg/kWh",
  },
  {
    time: "Every 6 months",
    icon: Trophy,
    tone: "text-primary bg-primary/10",
    title: "Measure the trunk, see real growth",
    body: "A tape around the trunk turns estimated growth into measured growth, and your Green Score moves with it.",
    tag: "Chave et al. 2014 · measured growth",
  },
]

export function DayTimeline() {
  return (
    <ol className="relative before:absolute before:left-[1.375rem] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-gradient-to-b before:from-primary/60 before:via-border before:to-transparent md:before:left-1/2">
      {EVENTS.map((e, i) => {
        const Icon = e.icon
        const right = i % 2 === 1
        return (
          <li key={e.title} className={`relative pb-5 pl-16 md:grid md:grid-cols-2 md:gap-20 md:pl-0 ${i > 0 ? "md:-mt-14" : ""}`}>
            <span className="absolute left-0 top-4 z-10 rounded-full bg-background ring-4 ring-background md:left-1/2 md:-translate-x-1/2">
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ${e.tone}`}>
                <Icon className="h-5 w-5" />
              </span>
            </span>
            <Reveal delay={60} className={right ? "md:col-start-2" : "md:text-right"}>
              <div className="panel p-5">
                <p className="num text-xs font-semibold uppercase tracking-wider text-primary">{e.time}</p>
                <h3 className="mt-1 font-semibold">{e.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{e.body}</p>
                <p className="mt-3 text-[11px] text-muted-foreground/80">{e.tag}</p>
              </div>
            </Reveal>
          </li>
        )
      })}
    </ol>
  )
}

import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Check,
  Factory,
  Leaf,
  MapPin,
  Quote,
  Thermometer,
  TreePine,
  Wind,
  Zap,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { RegisterHousehold } from "@/components/register-household"
import { NetZeroCalculator } from "@/components/landing/net-zero-calculator"
import { DayTimeline } from "@/components/landing/day-timeline"
import { BuildExplorer } from "@/components/landing/build-explorer"
import { DataFlow } from "@/components/landing/data-flow"
import { CountUp, Reveal } from "@/components/landing/motion"
import { query, queryOne } from "@/lib/db"
import { EMISSION_FACTORS } from "@/lib/emission-factors"

export const dynamic = "force-dynamic"

const NAV = [
  { href: "#try", label: "Try it" },
  { href: "#day", label: "A day with HCCMS" },
  { href: "#build", label: "The build" },
  { href: "#journey", label: "Our journey" },
  { href: "#faq", label: "FAQ" },
]

const BUILD_FACTS: [string, string][] = [
  ["3", "ESP32 modules"],
  ["7", "sensors"],
  ["13", "API endpoints"],
  ["13", "species bark AI"],
  ["6 h", "offline buffer"],
  ["0", "fake numbers"],
]

async function networkStats() {
  try {
    return await queryOne<{ households: number; trees: number; readings: number; devices: number }>(
      `SELECT (SELECT count(*)::int FROM households) AS households,
              (SELECT count(*)::int FROM trees) AS trees,
              (SELECT count(*)::int FROM readings) AS readings,
              (SELECT count(*)::int FROM devices) AS devices`
    )
  } catch (err) {
    console.error("Network stats unavailable:", (err as Error).message)
    return null
  }
}

async function directory() {
  try {
    return await query<{ id: string; name: string; city: string; locality: string | null; trees: number }>(
      `SELECT h.id, h.name, h.city, h.locality,
              (SELECT count(*)::int FROM trees t WHERE t.household_id = h.id) AS trees
         FROM households h
        WHERE EXISTS (SELECT 1 FROM trees t WHERE t.household_id = h.id)
        ORDER BY h.created_at DESC LIMIT 8`
    )
  } catch {
    return []
  }
}

export default async function HomePage() {
  const [stats, households] = await Promise.all([networkStats(), directory()])

  return (
    <div className="min-h-screen overflow-x-clip">
      <SiteHeader
        nav={NAV}
        right={
          <a href="#start" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">
            Start free
          </a>
        }
      />

      <main>
        {/* ================= HERO ================= */}
        <section id="try" className="relative scroll-mt-16">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(hsl(150_14%_15%/0.35)_1px,transparent_1px),linear-gradient(90deg,hsl(150_14%_15%/0.35)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
          </div>

          <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 pb-16 pt-12 md:px-6 md:pt-20 lg:grid-cols-[1fr_1.05fr]">
            <div className="lg:sticky lg:top-28">
              <Reveal>
                <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  Namma Chennai · Climate action at home
                </p>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
                  Your tree is fighting the heat.{" "}
                  <span className="bg-gradient-to-br from-primary via-emerald-300 to-teal-300 bg-clip-text text-transparent">Let&apos;s prove it.</span>
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                  HCCMS puts your home&apos;s carbon next to the carbon your own trees lock away, measured with real forestry
                  maths, watched by low-cost sensors, and turned into one number you can actually move.
                </p>
              </Reveal>
              <Reveal delay={240}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a href="#start" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition-transform hover:-translate-y-0.5">
                    Start my net-zero journey <ArrowRight className="h-4 w-4" />
                  </a>
                  <a href="#build" className="rounded-xl border border-border bg-secondary/70 px-6 py-3.5 font-medium hover:bg-secondary">
                    See how it&apos;s built
                  </a>
                </div>
                <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  {["Free, no sign-up email", "No hardware to start", "Open methodology"].map((t) => (
                    <li key={t} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" />{t}</li>
                  ))}
                </ul>
              </Reveal>

              {stats && stats.households > 0 && (
                <Reveal delay={320}>
                  <dl className="mt-10 grid max-w-md grid-cols-3 gap-3">
                    {([[stats.households, "homes"], [stats.trees, "trees measured"], [stats.readings, "sensor readings"]] as const).filter(([v]) => v > 0).map(([v, l]) => (
                      <div key={l} className="rounded-xl border border-border/70 bg-card/60 p-3">
                        <dd className="text-2xl font-semibold"><CountUp value={v} /></dd>
                        <dt className="text-[11px] text-muted-foreground">{l}</dt>
                      </div>
                    ))}
                  </dl>
                </Reveal>
              )}
            </div>

            <Reveal delay={200}>
              <NetZeroCalculator />
            </Reveal>
          </div>

          {/* Build facts ribbon */}
          <div className="border-y border-border/60 bg-card/40">
            <dl className="mx-auto grid max-w-7xl grid-cols-3 gap-y-4 px-4 py-6 md:grid-cols-6 md:px-6">
              {BUILD_FACTS.map(([v, l]) => (
                <div key={l} className="text-center">
                  <dd className="num text-2xl font-semibold text-primary md:text-3xl">{v}</dd>
                  <dt className="text-xs text-muted-foreground">{l}</dt>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ================= WHY CHENNAI ================= */}
        <section id="chennai" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 md:px-6">
          <Reveal>
            <p className="eyebrow">Why this matters</p>
            <h2 className="mt-2 max-w-3xl text-balance text-4xl font-semibold tracking-tight">
              Chennai&apos;s surfaces got <span className="text-destructive">11.6 °C hotter</span> in thirty years. Trees are the cheapest air-conditioner we have.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-8 overflow-hidden rounded-2xl border border-border">
              <div className="heat-stripes h-16 md:h-20" aria-hidden />
              <div className="flex justify-between bg-card px-4 py-2 text-xs text-muted-foreground">
                <span><span className="num font-semibold text-foreground">35.6 °C</span> · 1991</span>
                <span>Peak land surface temperature, Chennai Metropolitan Area</span>
                <span><span className="num font-semibold text-destructive">47.2 °C</span> · 2021</span>
              </div>
            </div>
          </Reveal>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { icon: Wind, v: "3×", l: "PM2.5 above the WHO limit", n: "Linked to ~8,000 premature deaths a year in the city" },
              { icon: MapPin, v: "+30%", l: "Alandur vs the city average", n: "47 µg/m³ vs 31–36 citywide: averages hide your street" },
              { icon: TreePine, v: "−13%", l: "Green cover lost in a decade", n: "Household greenery can cut local surface heat by up to 2.5 °C" },
            ].map(({ icon: I, v, l, n }, i) => (
              <Reveal key={l} delay={i * 100}>
                <div className="panel h-full p-6">
                  <I className="h-5 w-5 text-primary" />
                  <p className="num mt-4 text-5xl font-semibold">{v}</p>
                  <p className="mt-2 font-medium">{l}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{n}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <figure className="mt-10 flex items-start gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-6 md:p-8">
              <Quote className="h-8 w-8 shrink-0 text-primary" />
              <div>
                <blockquote className="text-xl font-medium leading-snug md:text-2xl">
                  Climate action fails when responsibility is abstract. It succeeds when impact is measurable.
                </blockquote>
                <figcaption className="mt-3 text-sm text-muted-foreground">Team Tech Bloomers</figcaption>
              </div>
            </figure>
          </Reveal>
          <p className="mt-4 text-[11px] text-muted-foreground">Figures from the project&apos;s research brief.</p>
        </section>

        {/* ================= A DAY WITH HCCMS ================= */}
        <section id="day" className="scroll-mt-20 border-y border-border/60 bg-card/30">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
            <Reveal>
              <p className="eyebrow text-center">A day with HCCMS</p>
              <h2 className="mx-auto mt-2 max-w-2xl text-balance text-center text-4xl font-semibold tracking-tight">
                It watches your tree so you don&apos;t have to guess.
              </h2>
            </Reveal>
            <div className="mt-14">
              <DayTimeline />
            </div>
          </div>
        </section>

        {/* ================= THE BUILD ================= */}
        <section id="build" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 md:px-6">
          <Reveal>
            <p className="eyebrow">Under the hood</p>
            <h2 className="mt-2 max-w-3xl text-balance text-4xl font-semibold tracking-tight">
              Real hardware, real data, every step open.
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Three ESP32 modules stream to a REST API over your home Wi-Fi. A carbon engine turns readings, measurements and
              bills into your dashboard every 10 seconds.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-10"><DataFlow /></div>
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-6"><BuildExplorer /></div>
          </Reveal>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Reveal>
              <div className="panel h-full p-6">
                <Leaf className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold">Your trees</h3>
                <p className="mt-2 font-mono text-sm text-foreground">AGB = 0.0673 × (ρ·D²·H)^0.976</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The pantropical forestry equation (Chave et al., 2014). Only growth since you joined counts. Growth faster than 3×
                  normal is capped, and backdating earns nothing.
                </p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="panel h-full p-6">
                <Factory className="h-5 w-5 text-warning" />
                <h3 className="mt-3 font-semibold">Your home</h3>
                <p className="mt-2 font-mono text-sm text-foreground">CO₂ = units × {EMISSION_FACTORS.electricity.kgCO2PerUnit} kg</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Indian grid average (CEA). LPG {EMISSION_FACTORS.lpg.kgCO2PerUnit}, petrol {EMISSION_FACTORS.petrol.kgCO2PerUnit},
                  diesel {EMISSION_FACTORS.diesel.kgCO2PerUnit} kg CO₂ per unit from IPCC 2006.
                </p>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="panel h-full p-6">
                <Zap className="h-5 w-5 text-gold" />
                <h3 className="mt-3 font-semibold">Your Green Score</h3>
                <p className="mt-2 font-mono text-sm text-foreground">55% offset · 30% care · 15% trend</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Scores only what you control. Sensors never change carbon, and tampered data (lamps at night, indoor temperatures)
                  is flagged and excluded.
                </p>
              </div>
            </Reveal>
          </div>
          <a href="https://github.com/Jos-zenith/victori#how-carbon-is-calculated" target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
            Full methodology, sources and firmware on GitHub <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </section>

        {/* ================= JOURNEY ================= */}
        <section id="journey" className="scroll-mt-20 border-y border-border/60 bg-card/30">
          <div className="mx-auto max-w-7xl px-4 py-20 md:px-6">
            <Reveal>
              <p className="eyebrow">Our journey</p>
              <h2 className="mt-2 max-w-3xl text-balance text-4xl font-semibold tracking-tight">
                From a breadboard on a lab bench to a platform for every home.
              </h2>
            </Reveal>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
              <Reveal>
                <div className="grid h-full grid-cols-2 gap-3">
                  <figure className="panel relative row-span-2 overflow-hidden !p-0">
                    <Image src="/images/prototype-bench.jpg" alt="Phase 1 prototype: ESP32, ESP32-CAM, dust sensor and LCD on a lab bench, with the first dashboard on a laptop" width={825} height={1100} className="h-full w-full object-cover" />
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-xs text-white/90">Phase 1 prototype on the bench, with the first dashboard</figcaption>
                  </figure>
                  <figure className="panel relative overflow-hidden !p-0">
                    <Image src="/images/prototype-wiring.jpg" alt="Close-up of the sensor wiring: ESP32 boards, Arduino, dust sensor and soil probe" width={1120} height={840} className="h-full w-full object-cover" />
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-[11px] text-white/90">Live readings: Dust 150 · CO₂ 510.8</figcaption>
                  </figure>
                  <figure className="panel relative overflow-hidden bg-white !p-0">
                    <Image src="/images/thingspeak-phase1.jpg" alt="ThingSpeak charts of gas sensor, temperature and humidity readings from Phase 1" width={512} height={242} className="h-full w-full object-contain" />
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-[11px] text-white/90">Phase 1 data on ThingSpeak</figcaption>
                  </figure>
                </div>
              </Reveal>

              <div className="space-y-4">
                {[
                  { phase: "Phase 1", state: "Completed", tone: "bg-primary text-primary-foreground", title: "Basic IoT implementation", body: "ESP32 and Arduino with gas, dust, soil and climate sensors, streaming to ThingSpeak, plus the first carbon score calculator." },
                  { phase: "Phase 2", state: "Live now", tone: "bg-gold text-black", title: "Analysis & carbon calculation", body: "This platform: measurement-based tree carbon, household emissions, Green Score, tamper checks, bark AI, offline-safe firmware." },
                  { phase: "Phase 3", state: "Next", tone: "bg-secondary text-foreground", title: "Optimisation & scale", body: "NDIR CO₂ and laser PM sensors, utility data feeds, verified community roll-ups, and rebates with local bodies." },
                ].map((p, i) => (
                  <Reveal key={p.phase} delay={i * 120}>
                    <div className="panel p-5">
                      <div className="flex items-center gap-3">
                        <span className="num text-sm font-semibold text-muted-foreground">{p.phase}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${p.tone}`}>{p.state}</span>
                      </div>
                      <h3 className="mt-2 font-semibold">{p.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
                    </div>
                  </Reveal>
                ))}
                <Reveal delay={360}>
                  <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 to-transparent p-5">
                    <p className="text-sm text-muted-foreground">Built by</p>
                    <p className="text-xl font-semibold">Team Tech Bloomers</p>
                    <p className="text-sm text-muted-foreground">
                      Loyola-ICAM College of Engineering &amp; Technology · Team lead: Tabitha · Smart &amp; Sustainable Tamil Nadu: Urban Heat, Air &amp; Environmental Mitigation
                    </p>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* ================= COMMUNITY ================= */}
        {households.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
            <Reveal>
              <p className="eyebrow">Community</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-tight">Homes already on the journey</h2>
            </Reveal>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {households.map((h, i) => (
                <Reveal key={h.id} delay={i * 60}>
                  <Link href={`/h/${h.id}`} className="panel group block p-5 transition-colors hover:border-primary/40">
                    <p className="font-semibold group-hover:text-primary">{h.name}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {[h.locality, h.city].filter(Boolean).join(", ")}
                    </p>
                    <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                      <TreePine className="h-3.5 w-3.5 text-primary" /> {h.trees} tree{h.trees === 1 ? "" : "s"}
                    </p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* ================= START ================= */}
        <section id="start" className="relative mx-auto max-w-7xl scroll-mt-20 px-4 py-20 md:px-6">
          <Reveal>
            <div className="mb-8 text-center">
              <Thermometer className="mx-auto h-8 w-8 text-primary float-slow" />
              <h2 className="mx-auto mt-4 max-w-2xl text-balance text-4xl font-semibold tracking-tight">
                Three minutes from now, you&apos;ll know your number.
              </h2>
              <p className="mt-3 text-muted-foreground">Then every month, you get to move it.</p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <RegisterHousehold />
          </Reveal>
        </section>

        {/* ================= FAQ ================= */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-24 md:px-6">
          <p className="eyebrow">FAQ</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight">Honest answers</h2>
          <div className="mt-8 divide-y divide-border rounded-2xl border border-border">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span className="text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

const FAQ: [string, string][] = [
  [
    "Are these real carbon credits I can sell?",
    "Not yet, and we won't pretend otherwise. HCCMS reports transparent, unverified estimates in tonnes of CO₂ so households can see and improve their impact. Tradable credits (Verra, Gold Standard, India's CCTS) need approved methodologies and third-party verification at project scale. HCCMS keeps the measurement history needed for community-level verification and local rebates later.",
  ],
  [
    "Do I need to buy sensors?",
    "No. Your electricity bill and a tape measure are enough to see your net balance and Green Score. Low-cost sensor modules add tree-care alerts, the Tree Care part of the score, and local air quality.",
  ],
  [
    "Why do I have to measure my tree?",
    "Because that's how tree carbon is really measured. Soil and light sensors tell us about health, not how much carbon the wood stored. A tape around the trunk every six months turns estimated growth into measured growth.",
  ],
  [
    "Can someone cheat by faking sensor data?",
    "It wouldn't help: sensor data never changes the carbon figures. Readings are also checked for tampering, such as bright light at night or a temperature that never changes, and flagged modules are excluded from the score.",
  ],
  [
    "What data do you store?",
    "Your household name and locality, tree measurements, the bill quantities you enter, and sensor readings. Keys are stored only as hashes, and photos are analysed and discarded. The privacy page has the details.",
  ],
]

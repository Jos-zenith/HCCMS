import Link from "next/link"
import { Car, Cpu, Home, Leaf, MapPin, Sprout, TreePine, Zap } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { RegisterHousehold } from "@/components/register-household"
import { query } from "@/lib/db"

export const dynamic = "force-dynamic"

const MODULES = [
  {
    icon: TreePine,
    title: "Tree module",
    text: "ESP32 with soil moisture, SHT31, pH and LDR sensors. It tracks how well the tree is cared for and flags dry soil, bad pH or stress before growth suffers.",
  },
  {
    icon: Sprout,
    title: "Leaf camera",
    text: "ESP32-CAM photographs the canopy at fixed times for an indicative leaf-colour check. Species can be identified from a phone photo of the bark.",
  },
  {
    icon: Car,
    title: "Vehicle & ambient air",
    text: "PM2.5 and MQ135 sensors show the air your household breathes. Vehicle CO₂ itself is counted from fuel purchases, not from the sensor.",
  },
  {
    icon: Zap,
    title: "Household emissions",
    text: "Electricity units, LPG refills and fuel from your bills are converted to CO₂ using national and IPCC emission factors.",
  },
]

export default async function HomePage() {
  const households = await query<{ id: string; name: string; city: string; locality: string | null; trees: number; devices: number }>(
    `SELECT h.id, h.name, h.city, h.locality,
            (SELECT count(*)::int FROM trees t WHERE t.household_id = h.id) AS trees,
            (SELECT count(*)::int FROM devices d WHERE d.household_id = h.id) AS devices
       FROM households h ORDER BY h.created_at DESC LIMIT 100`
  )

  return (
    <div className="min-h-screen">
      <SiteHeader
        right={
          <a href="#register" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Register household
          </a>
        }
      />

      <main className="mx-auto max-w-7xl space-y-16 px-4 py-10 md:px-6 md:py-16">
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <p className="eyebrow text-primary">Climate action · Smart &amp; Sustainable Tamil Nadu</p>
          <h1 className="mt-4 max-w-4xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            If you can measure it,{" "}
            <span className="bg-gradient-to-br from-primary via-emerald-300 to-teal-300 bg-clip-text text-transparent">
              you can change it.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Households plant trees but never see what those trees do. HCCMS measures each tree&apos;s growth with the standard
            forestry equation, monitors its care with low-cost IoT sensors, and weighs it against the home&apos;s own emissions
            to give a Green Score.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#register" className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:bg-primary/90">
              Start monitoring
            </a>
            <a href="#households" className="rounded-lg border border-border bg-secondary px-5 py-2.5 font-medium hover:bg-secondary/70">
              View households
            </a>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="panel p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>

        <section className="panel grid gap-8 p-6 md:grid-cols-[1fr_1.4fr] md:p-10">
          <div>
            <p className="eyebrow">Why Chennai</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Climate action fails when responsibility is abstract.</h2>
            <p className="mt-3 text-muted-foreground">
              City-wide averages hide neighbourhood hotspots. Household-level measurement makes each tree&apos;s contribution
              visible and gives residents a reason to keep it healthy.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-4">
            {[
              ["3×", "PM2.5 above the WHO limit in parts of the city"],
              ["+30%", "PM2.5 in Alandur vs the citywide average"],
              ["−13%", "green cover lost in the last decade"],
              ["47.2 °C", "peak land surface temperature (2021), up from 35.6 °C in 1991"],
            ].map(([v, label]) => (
              <div key={label} className="rounded-xl border border-border/70 bg-background/40 p-4">
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="num text-3xl font-semibold text-primary">{v}</span>
                  <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="households" className="space-y-5 scroll-mt-24">
          <div>
            <p className="eyebrow">Households</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Monitored homes</h2>
          </div>
          {households.length === 0 ? (
            <div className="panel flex flex-col items-center p-10 text-center">
              <Home className="h-8 w-8 text-primary" />
              <p className="mt-3 font-medium">No households registered yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Register yours below to connect your first sensor module.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {households.map((h) => (
                <Link key={h.id} href={`/h/${h.id}`} className="panel group p-5 transition-colors hover:border-primary/40">
                  <p className="font-semibold group-hover:text-primary">{h.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {[h.locality, h.city].filter(Boolean).join(", ")}
                  </p>
                  <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Leaf className="h-3.5 w-3.5 text-primary" />{h.trees} trees</span>
                    <span className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5 text-primary" />{h.devices} modules</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section id="register" className="scroll-mt-24">
          <RegisterHousehold />
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        HCCMS by Team Tech Bloomers · Loyola-ICAM College of Engineering &amp; Technology
      </footer>
    </div>
  )
}

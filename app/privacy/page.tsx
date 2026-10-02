import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export const metadata: Metadata = { title: "Privacy · HCCMS" }

const SECTIONS: [string, string[]][] = [
  [
    "What we store",
    [
      "Household: the name, locality, city and number of members you enter.",
      "Trees: species, every trunk and height measurement with its date, and which modules are linked.",
      "Emissions: the bill quantities, periods and notes you enter (for example 210 kWh, 1–30 Sept).",
      "Sensor readings: temperature, humidity, soil moisture, soil pH, light, PM2.5 and CO₂ values with timestamps.",
      "Leaf scans: three colour indices per photo. The photo itself is analysed and discarded, never stored.",
    ],
  ],
  [
    "What we don't store",
    [
      "Your household key or device keys in readable form. Only a SHA-256 hash is kept, so they cannot be recovered from the database.",
      "Names of people, phone numbers, email addresses, exact addresses or GPS locations.",
      "Bark photos used for species identification. They are classified and discarded.",
    ],
  ],
  [
    "Who can see it",
    [
      "A household dashboard is visible to anyone who has its link. The link contains a random ID that cannot be guessed.",
      "Households with at least one tree are listed on the home page by name and locality. Use a nickname if you prefer.",
      "Only someone holding the household key can change devices, trees or bills.",
    ],
  ],
  [
    "Removing data",
    [
      "Deleting a device removes all of its readings. Deleting a tree removes its measurement history and leaf scans.",
      "To delete a whole household, contact the project team through the repository linked below.",
    ],
  ],
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 md:px-6">
        <p className="eyebrow">Privacy</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Your data, plainly.</h1>
        <p className="mt-4 text-muted-foreground">
          HCCMS collects only what it needs to calculate your household&apos;s carbon balance and look after your trees.
        </p>
        <div className="mt-10 space-y-10">
          {SECTIONS.map(([title, items]) => (
            <section key={title}>
              <h2 className="text-xl font-semibold">{title}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

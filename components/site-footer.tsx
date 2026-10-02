import Link from "next/link"
import { Leaf } from "lucide-react"

const REPO = "https://github.com/Jos-zenith/victori"

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: "Product",
    links: [
      ["How it works", "/#how"],
      ["The numbers", "/#method"],
      ["FAQ", "/#faq"],
      ["Start free", "/#start"],
    ],
  },
  {
    title: "Project",
    links: [
      ["Why Chennai", "/#chennai"],
      ["Methodology & sources", `${REPO}#how-carbon-is-calculated`],
      ["Hardware & firmware", `${REPO}/tree/main/hardware`],
      ["Source code", REPO],
    ],
  },
  {
    title: "Legal",
    links: [["Privacy", "/privacy"]],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.5fr_repeat(3,1fr)] md:px-6">
        <div>
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-teal-400">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </span>
            HCCMS
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Household Carbon Credit Monitoring System. Built for Smart &amp; Sustainable Tamil Nadu by Team Tech Bloomers,
            Loyola-ICAM College of Engineering &amp; Technology.
          </p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="text-sm font-semibold">{c.title}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  {href.startsWith("http") ? (
                    <a href={href} className="hover:text-foreground" target="_blank" rel="noreferrer">{label}</a>
                  ) : (
                    <Link href={href} className="hover:text-foreground">{label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        Estimates for awareness and community programmes. Not tradable carbon credits.
      </p>
    </footer>
  )
}

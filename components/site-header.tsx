import Link from "next/link"
import type { ReactNode } from "react"
import { Leaf } from "lucide-react"

export function SiteHeader({ nav, right }: { nav?: { href: string; label: string }[]; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-teal-400 shadow-lg shadow-primary/20">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="leading-tight">
            <span className="block font-semibold tracking-tight">HCCMS</span>
            <span className="hidden text-[11px] text-muted-foreground sm:block">Household net-zero tracker</span>
          </span>
        </Link>
        {nav && (
          <nav aria-label="Sections" className="hidden flex-1 justify-center gap-1 lg:flex">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {n.label}
              </a>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">{right}</div>
      </div>
    </header>
  )
}

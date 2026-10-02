"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button, ErrorText, Field, Input } from "./ui"
import { api, saveHouseholdKey } from "@/lib/household-client"

export function RegisterHousehold() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError("")
    try {
      const res = await api<{ id: string; key: string }>("/api/households", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          city: form.get("city"),
          locality: form.get("locality"),
          members: form.get("members") || null,
        }),
      })
      saveHouseholdKey(res.id, res.key)
      router.push(`/h/${res.id}/manage?new=1`)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="panel grid gap-8 p-6 md:grid-cols-[1fr_1.2fr] md:p-10">
      <div>
        <p className="eyebrow">Start free</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Create your household</h2>
        <p className="mt-2 text-sm text-muted-foreground">No account, email or hardware needed. You&apos;ll get a private household key instead.</p>
        <ol className="mt-5 space-y-3 text-sm">
          <li className="flex gap-3"><span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">1</span><span>Name your home <span className="text-muted-foreground">(30 seconds)</span></span></li>
          <li className="flex gap-3"><span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">2</span><span>Enter last month&apos;s electricity units <span className="text-muted-foreground">(from your bill)</span></span></li>
          <li className="flex gap-3"><span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">3</span><span>Add a tree with a tape-measured girth <span className="text-muted-foreground">(1 minute)</span></span></li>
          <li className="flex gap-3 text-muted-foreground"><span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs">+</span><span>Later: connect sensor modules for care alerts</span></li>
        </ol>
      </div>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Household name">
            <Input name="name" required maxLength={80} placeholder="e.g. Green House, Alandur" />
          </Field>
        </div>
        <Field label="Locality">
          <Input name="locality" maxLength={80} placeholder="e.g. Alandur" />
        </Field>
        <Field label="City">
          <Input name="city" maxLength={60} defaultValue="Chennai" />
        </Field>
        <Field label="People in the home">
          <Input name="members" type="number" min={1} max={50} placeholder="4" />
        </Field>
        <div className="flex items-end">
          <Button type="submit" loading={busy} className="w-full">
            Create &amp; continue
          </Button>
        </div>
        <div className="sm:col-span-2">
          <ErrorText>{error}</ErrorText>
        </div>
      </form>
    </div>
  )
}

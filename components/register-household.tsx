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
        <p className="eyebrow">Get started</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Register your household</h2>
        <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>1. Register and save your household key.</li>
          <li>2. Add modules and flash each device key into its ESP32.</li>
          <li>3. Add your trees with trunk girth and height.</li>
          <li>4. Log your electricity and LPG bills each month.</li>
        </ol>
      </div>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Household name">
            <Input name="name" required maxLength={80} placeholder="e.g. Tabitha's home" />
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
            Create household
          </Button>
        </div>
        <div className="sm:col-span-2">
          <ErrorText>{error}</ErrorText>
        </div>
      </form>
    </div>
  )
}

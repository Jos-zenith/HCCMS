"use client"

import { useCallback, useEffect, useState } from "react"

// The household key lives only in this browser (localStorage) and is sent as a header
// on management requests. The server stores just its SHA-256 hash.

const storageKey = (id: string) => `hccms:household-key:${id}`

export function saveHouseholdKey(id: string, key: string) {
  try {
    localStorage.setItem(storageKey(id), key)
  } catch {
    /* storage unavailable */
  }
}

export function useHouseholdKey(id: string) {
  const [key, setKey] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      setKey(localStorage.getItem(storageKey(id)))
    } catch {
      setKey(null)
    }
    setReady(true)
  }, [id])

  const save = useCallback(
    (k: string) => {
      saveHouseholdKey(id, k)
      setKey(k)
    },
    [id]
  )
  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey(id))
    } catch {
      /* ignore */
    }
    setKey(null)
  }, [id])

  return { key, ready, save, clear }
}

export async function api<T = unknown>(path: string, init: RequestInit & { householdKey?: string | null } = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.householdKey) headers.set("x-household-key", init.householdKey)
  if (init.body && typeof init.body === "string") headers.set("content-type", "application/json")
  const res = await fetch(path, { ...init, headers, cache: "no-store" })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data as T
}

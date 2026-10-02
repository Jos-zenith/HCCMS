import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

export const metadata: Metadata = {
  title: "HCCMS - Household Carbon Credit Monitoring",
  description:
    "Real-time IoT-powered carbon credit scoring with ESP32 sensor integration, Chave equation biomass estimation, and tree identification.",
}

export const viewport: Viewport = {
  themeColor: "#07130c",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}

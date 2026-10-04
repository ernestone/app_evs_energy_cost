import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { DeployRefresh } from "@/components/deploy-refresh"
import "./globals.css"

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "EV calculadora de costes",
  description:
    "Compara la energía y el CO₂ de usar un eléctrico y un coche de combustión, con precios del país y consumo EPA o WLTP.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geist.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        {children}
        <DeployRefresh />
      </body>
    </html>
  )
}

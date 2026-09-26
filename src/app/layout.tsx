import type { Metadata } from "next"
import { Fraunces, Source_Sans_3 } from "next/font/google"
import "./globals.css"

const source = Source_Sans_3({
  variable: "--font-source",
  subsets: ["latin"],
})

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Paralelo",
  description:
    "Compara la energía y el CO₂ de usar un eléctrico y un coche de combustión, con precios del país y consumo EPA.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${source.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">{children}</body>
    </html>
  )
}

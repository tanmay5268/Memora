import { Inter, JetBrains_Mono } from "next/font/google"
import localFont from "next/font/local"
import { Toaster } from "@workspace/ui/components/toast"
import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

// Subsetted to the ligatures used by <Icon /> — see app/fonts/README.md.
// `display: "block"` avoids a flash of raw ligature text ("arrow_forward")
// while the 3 kB file loads.
const materialSymbols = localFont({
  src: "./fonts/MaterialSymbolsOutlined.woff2",
  weight: "400",
  style: "normal",
  display: "block",
  variable: "--font-symbols",
  fallback: [],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "dark antialiased",
        inter.variable,
        jetbrainsMono.variable,
        materialSymbols.variable,
      )}
    >
      <body className="min-h-screen flex flex-col bg-surface font-body-md text-body-md text-on-surface selection:bg-primary-container selection:text-white">
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}
import { Geist, Geist_Mono, JetBrains_Mono, Inter, Outfit, Raleway } from "next/font/google"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils";

const ralewayHeading = Raleway({subsets:['latin'],variable:'--font-heading'});

const outfit = Outfit({subsets:['latin'],variable:'--font-sans'})

const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-mono'})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", jetbrainsMono.variable, "font-sans", outfit.variable, ralewayHeading.variable)}
    >
      <body className="h-screen flex items-center justify-center">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}

import { Geist, Geist_Mono, JetBrains_Mono, Inter, Outfit, Raleway } from "next/font/google"
import { Toaster } from "@workspace/ui/components/toast"
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
      className={cn("antialiased", outfit.variable, ralewayHeading.variable, "font-mono", jetbrainsMono.variable)}
    >
      <body className="">
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster /> 
      </body>
    </html>
  )
}

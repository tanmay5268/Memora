import { Architecture } from "./components/Architecture"
import { Benchmarks } from "./components/Benchmarks"
import { CodeDemo } from "./components/CodeDemo"
import { FinalCTA } from "./components/FinalCTA"
import { Footer } from "./components/Footer"
import { Header } from "./components/Header"
import { Hero } from "./components/Hero"
import { Personas } from "./components/Personas"
import { Pillars } from "./components/Pillars"

export default function Home() {
  return (
    <>
      <Header />
      <main className="w-full pt-16 bg-surface flex-1">
        <Hero />
        <Benchmarks />
        <CodeDemo />
        <Pillars />
        <Architecture />
        <Personas />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
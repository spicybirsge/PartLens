import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Box,
  FileText,
  MousePointer2,
  ScanLine,
  Wrench,
} from "lucide-react";
import { SiGithub } from "@icons-pack/react-simple-icons";
import Navbar from "@/components/Navbar";
import Reveal from "@/components/about/Reveal";

export const metadata: Metadata = {
  title: "About",
  description:
    "PartLens connects interactive 3D models with the technical documentation that keeps machines moving.",
};

const principles = [
  {
    icon: ScanLine,
    index: "01",
    title: "See the whole system",
    description:
      "Explore a machine spatially instead of searching through disconnected lists and filenames.",
  },
  {
    icon: FileText,
    index: "02",
    title: "Find the right page",
    description:
      "Connect each model part to the manuals, drawings, and service information behind it.",
  },
  {
    icon: Wrench,
    index: "03",
    title: "Work with confidence",
    description:
      "Give technicians and engineers a clearer path from identifying a part to acting on it.",
  },
];

export default function Page() {
  return (
    <>
      <Navbar />
      <main className="overflow-hidden">
        <section className="border-b bg-muted/30">
          <div className="mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-28">
            <div>
              <p
                className="about-animate-fade-up mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground"
                style={{ animationDelay: "0ms" }}
              >
                <span className="h-px w-8 bg-foreground" />
                The reference layer for machines
              </p>
              <h1
                className="about-animate-fade-up max-w-3xl text-5xl font-semibold tracking-[-0.055em] text-foreground sm:text-6xl lg:text-7xl"
                style={{ animationDelay: "90ms" }}
              >
                Understand every part of the machine.
              </h1>
              <p
                className="about-animate-fade-up mt-7 max-w-xl text-lg leading-8 text-muted-foreground"
                style={{ animationDelay: "180ms" }}
              >
                PartLens brings 3D models and technical documentation together in one precise, searchable workspace — so the answer is never more than a part away.
              </p>
              <div
                className="about-animate-fade-up mt-9 flex flex-wrap items-center gap-4"
                style={{ animationDelay: "270ms" }}
              >
                <Link
                  href="/login"
                  className="group inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-all hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
                >
                  Get started
                  <ArrowRight aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <a
                  href="https://github.com/spicybirsge/PartLens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-11 items-center gap-2 rounded-md border bg-background px-5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:bg-muted hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
                >
                  <SiGithub aria-hidden="true" className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
                  Contribute
                </a>
              </div>
            </div>

            <div
              className="about-animate-fade-up group relative min-h-[360px] border bg-background p-5 shadow-sm transition-shadow duration-500 hover:shadow-md sm:p-8"
              style={{ animationDelay: "200ms" }}
            >
              <div className="absolute inset-5 border border-dashed border-border transition-colors duration-500 group-hover:border-muted-foreground/40 sm:inset-8" />
              <div className="relative flex h-full min-h-[300px] flex-col justify-between">
                <div className="flex items-start justify-between text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  <span>PartLens / 001</span>
                  <span className="flex items-center gap-2">
                    <span className="relative flex size-1.5">
                      <span className="about-ping-soft absolute inline-flex h-full w-full rounded-full bg-emerald-500" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Model view
                  </span>
                </div>
                <div className="relative mx-auto flex size-48 items-center justify-center rounded-full border border-border transition-colors duration-500 group-hover:border-muted-foreground/30 sm:size-56">
                  <div className="about-spin-slower absolute size-32 rounded-full border border-dashed border-muted-foreground/50 sm:size-40" />
                  <div className="about-float flex items-center justify-center">
                    <Box className="size-16 stroke-[1] text-foreground transition-transform duration-500 group-hover:scale-110" aria-hidden="true" />
                  </div>
                  <span className="about-float-delayed absolute -right-12 top-5 border bg-background px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground shadow-sm">
                    Part ID
                  </span>
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-foreground px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-background transition-transform duration-300 group-hover:-translate-y-1">
                    Select to inspect
                  </span>
                </div>
                <div className="flex items-end justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-2"><MousePointer2 className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" /> Interactive by design</span>
                  <span>03 / 12</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Why PartLens</p>
              <h2 className="mt-5 max-w-md text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Technical clarity, without the hunt.</h2>
            </Reveal>
            <Reveal delayMs={120} className="max-w-2xl text-lg leading-8 text-muted-foreground">
              <p>Machines are complex. The information used to understand them should not be.</p>
              <p className="mt-6">PartLens is an open platform for making technical knowledge easier to navigate. Upload a model, connect its parts to documentation, and create a living reference that feels as considered as the machine itself.</p>
            </Reveal>
          </div>
        </section>

        <section className="border-y bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <Reveal className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">The approach</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Designed around the way people work.</h2>
              </div>
            </Reveal>
            <div className="grid divide-y border-y bg-background/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {principles.map((principle, i) => {
                const Icon = principle.icon;
                return (
                  <Reveal key={principle.index} delayMs={i * 120} y={24} className="h-full">
                    <article className="group flex min-h-64 flex-col gap-8 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-muted/40 sm:p-8">
                      <div className="flex items-center justify-between">
                        <span className="flex size-10 items-center justify-center rounded-md border bg-background transition-all duration-300 group-hover:scale-110 group-hover:shadow-sm">
                          <Icon className="size-5 stroke-[1.5]" aria-hidden="true" />
                        </span>
                        <span className="font-mono text-xs text-muted-foreground transition-colors duration-300 group-hover:text-foreground">{principle.index}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-medium tracking-tight">{principle.title}</h3>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{principle.description}</p>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <Reveal y={24}>
            <div className="group relative flex flex-col items-start justify-between gap-8 overflow-hidden border bg-foreground p-8 text-background sm:p-12 lg:flex-row lg:items-center rounded-lg">
              <div
                aria-hidden="true"
                className="about-float pointer-events-none absolute -left-16 -top-24 size-64 rounded-full bg-background/10 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="about-float-delayed pointer-events-none absolute -bottom-28 right-10 size-72 rounded-full bg-background/10 blur-3xl"
              />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-background/60">Start with the machine</p>
                <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Make technical knowledge easier to reach.</h2>
              </div>
              <Link
                href="/login"
                className="relative inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-background px-5 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg hover:opacity-90 active:translate-y-0 active:scale-[0.98]"
              >
                Create a project
                <ArrowRight aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>
    </>
  );
}

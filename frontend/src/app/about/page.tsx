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
              <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                <span className="h-px w-8 bg-foreground" />
                The reference layer for machines
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.055em] text-foreground sm:text-6xl lg:text-7xl">
                Understand every part of the machine.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
                PartLens brings 3D models and technical documentation together in one precise, searchable workspace — so the answer is never more than a part away.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Get started
                  <ArrowRight aria-hidden="true" />
                </Link>
                <a
                  href="https://github.com/spicybirsge/PartLens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-md border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <SiGithub aria-hidden="true" />
                  Contribute
                </a>
              </div>
            </div>

            <div className="relative min-h-[360px] border bg-background p-5 shadow-sm sm:p-8">
              <div className="absolute inset-5 border border-dashed border-border sm:inset-8" />
              <div className="relative flex h-full min-h-[300px] flex-col justify-between">
                <div className="flex items-start justify-between text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  <span>PartLens / 001</span>
                  <span>Model view</span>
                </div>
                <div className="relative mx-auto flex size-48 items-center justify-center rounded-full border border-border sm:size-56">
                  <div className="absolute size-32 rounded-full border border-dashed border-muted-foreground/50 sm:size-40" />
                  <Box className="size-16 stroke-[1] text-foreground" aria-hidden="true" />
                  <span className="absolute -right-12 top-5 border bg-background px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Part ID
                  </span>
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-foreground px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-background">
                    Select to inspect
                  </span>
                </div>
                <div className="flex items-end justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-2"><MousePointer2 className="size-3.5" aria-hidden="true" /> Interactive by design</span>
                  <span>03 / 12</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Why PartLens</p>
              <h2 className="mt-5 max-w-md text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Technical clarity, without the hunt.</h2>
            </div>
            <div className="max-w-2xl text-lg leading-8 text-muted-foreground">
              <p>Machines are complex. The information used to understand them should not be.</p>
              <p className="mt-6">PartLens is an open platform for making technical knowledge easier to navigate. Upload a model, connect its parts to documentation, and create a living reference that feels as considered as the machine itself.</p>
            </div>
          </div>
        </section>

        <section className="border-y bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">The approach</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Designed around the way people work.</h2>
              </div>
              <p className="max-w-xs text-sm leading-6 text-muted-foreground">A direct path from context, to identification, to action.</p>
            </div>
            <div className="grid divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {principles.map((principle) => {
                const Icon = principle.icon;
                return (
                  <article key={principle.index} className="flex min-h-64 flex-col gap-8 p-6 sm:p-8">
                    <div className="flex items-center justify-between">
                      <Icon className="size-5 stroke-[1.5]" aria-hidden="true" />
                      <span className="font-mono text-xs text-muted-foreground">{principle.index}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-medium tracking-tight">{principle.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{principle.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="flex flex-col items-start justify-between gap-8 border bg-foreground p-8 text-background sm:p-12 lg:flex-row lg:items-center rounded-lg">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-background/60">Start with the machine</p>
              <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Make technical knowledge easier to reach.</h2>
            </div>
            <Link href="/login" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-background px-5 text-sm font-medium text-foreground transition-opacity hover:opacity-90">
              Create a project
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_public/about")({
  head: () => ({
    meta: [
      { title: "About ClosetCycle" },
      {
        name: "description",
        content:
          "ClosetCycle is a coordinator-managed clothing redistribution platform that keeps wearable textiles out of landfill.",
      },
      { property: "og:title", content: "About ClosetCycle" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
        Our mission
      </p>
      <h1 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
        Less waste. <span className="italic">More wear.</span>
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
        Every year, millions of wearable garments end up in landfill while
        someone in the same neighbourhood needs exactly that piece. ClosetCycle
        is a small, coordinator-led platform that bridges that gap — without
        forcing anyone to download a complex app or create yet another account.
      </p>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          { n: "1", t: "Donors stay simple", d: "A 2-minute form. No login. No friction." },
          { n: "2", t: "Coordinator curates", d: "Every piece is reviewed, photographed, tagged." },
          { n: "3", t: "Receivers shop free", d: "Browse like a shop — reserve what fits." },
        ].map((s) => (
          <div key={s.n} className="rounded-2xl border border-border bg-card p-5">
            <span className="font-display text-3xl text-primary">{s.n}</span>
            <h3 className="mt-2 font-display text-lg text-foreground">{s.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button asChild><Link to="/donate">Donate clothes</Link></Button>
        <Button asChild variant="outline"><Link to="/browse">Browse the catalog</Link></Button>
      </div>
    </div>
  );
}

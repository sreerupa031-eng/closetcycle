import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Heart, PackageCheck, Recycle } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-clothing.jpg";

export const Route = createFileRoute("/_public/")({
  head: () => ({
    meta: [
      { title: "ClosetCycle — Less waste, more wear" },
      {
        name: "description",
        content:
          "A coordinator-managed platform that connects clothing donors with people who need them. Donate in 2 minutes or browse free pre-loved pieces.",
      },
      { property: "og:title", content: "ClosetCycle — Less waste, more wear" },
      { property: "og:image", content: heroImage },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto grid gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Reducing textile waste, one closet at a time
            </span>
            <h1 className="font-display text-4xl leading-[1.05] text-foreground md:text-6xl">
              Give your clothes a{" "}
              <span className="italic text-primary">second life</span>.
            </h1>
            <p className="max-w-lg text-base text-muted-foreground md:text-lg">
              ClosetCycle connects neighbours through a simple coordinator-led
              process. No apps to learn. Just donate, browse, and reserve —
              the rest is handled for you.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/donate">
                  Donate clothes <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/browse">Browse catalog</Link>
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Recycle className="h-4 w-4 text-primary" /> 100% reused
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" /> Always free
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-accent/40 blur-2xl" />
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
              <img
                src={heroImage}
                alt="Folded sustainable clothing in earthy tones"
                width={1600}
                height={1024}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/60 bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              How it works
            </p>
            <h2 className="mt-3 font-display text-3xl text-foreground md:text-4xl">
              Three steps. Zero friction.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: PackageCheck,
                title: "Donate",
                body:
                  "Fill a 30-second form with photos. No login, no account, no fuss.",
              },
              {
                icon: Heart,
                title: "Coordinator curates",
                body:
                  "Our coordinator reviews each piece, categorises it, and lists it.",
              },
              {
                icon: Recycle,
                title: "Reserve & collect",
                body:
                  "Browse the catalog and reserve what you love — pickup or delivery.",
              },
            ].map(({ icon: Icon, title, body }, i) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-display text-sm text-muted-foreground">
                    Step 0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-xl text-foreground">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-border bg-accent/30 px-6 py-12 text-center md:px-12">
            <h2 className="font-display text-3xl text-foreground md:text-4xl">
              Ready to clear your closet?
            </h2>
            <p className="max-w-xl text-muted-foreground">
              Each piece you donate keeps fabric out of landfill — and brings
              joy to someone in your community.
            </p>
            <Button asChild size="lg">
              <Link to="/donate">Start your donation</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

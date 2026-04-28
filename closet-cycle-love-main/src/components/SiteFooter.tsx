import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-secondary/40">
      <div className="container mx-auto flex flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} ClosetCycle — Less waste, more wear.
        </p>
        <div className="flex gap-5">
          <Link to="/about" className="hover:text-foreground">About</Link>
          <Link to="/coordinator/login" className="hover:text-foreground">Coordinator</Link>
        </div>
      </div>
    </footer>
  );
}

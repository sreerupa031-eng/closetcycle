import { Link } from "@tanstack/react-router";
import type { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";

type Item = Tables<"clothing_items">;

const conditionLabel: Record<string, string> = {
  new: "New",
  lightly_used: "Lightly used",
  used: "Well loved",
};

const genderLabel: Record<string, string> = {
  men: "Men",
  women: "Women",
  unisex: "Unisex",
  kids: "Kids",
};

export function ItemCard({ item }: { item: Item }) {
  const cover = item.images?.[0];
  const isReserved = item.status === "reserved" || item.status === "delivered";
  return (
    <Link
      to="/item/$id"
      params={{ id: item.id }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-[var(--shadow-card)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
        {isReserved && (
          <div className="absolute left-3 top-3">
            <Badge className="bg-clay text-primary-foreground">Reserved</Badge>
          </div>
        )}
        <div className="absolute right-3 top-3">
          <Badge variant="secondary" className="bg-cream/90 backdrop-blur-sm">
            Free
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-base leading-tight text-foreground line-clamp-1">
          {item.title}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="border-border/70 text-[10px] font-normal uppercase tracking-wide">
            {item.size}
          </Badge>
          <Badge variant="outline" className="border-border/70 text-[10px] font-normal uppercase tracking-wide">
            {genderLabel[item.gender] ?? item.gender}
          </Badge>
          <Badge variant="outline" className="border-border/70 text-[10px] font-normal uppercase tracking-wide">
            {conditionLabel[item.condition] ?? item.condition}
          </Badge>
        </div>
      </div>
    </Link>
  );
}

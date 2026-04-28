import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ItemCard } from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_public/browse")({
  head: () => ({
    meta: [
      { title: "Browse the catalog — ClosetCycle" },
      {
        name: "description",
        content:
          "Browse free, pre-loved clothing donated by your community. Filter by size, gender, and category.",
      },
      { property: "og:title", content: "Browse the catalog — ClosetCycle" },
    ],
  }),
  component: BrowsePage,
});

const ALL = "all";

function BrowsePage() {
  const [size, setSize] = useState<string>(ALL);
  const [gender, setGender] = useState<string>(ALL);
  const [category, setCategory] = useState<string>(ALL);

  const { data, isLoading } = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clothing_items")
        .select("*")
        .in("status", ["approved", "reserved"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const items = data ?? [];

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (size !== ALL && i.size !== size) return false;
      if (gender !== ALL && i.gender !== gender) return false;
      if (category !== ALL && i.category !== category) return false;
      return true;
    });
  }, [items, size, gender, category]);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground md:text-4xl">
            The catalog
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${filtered.length} pieces available`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
          <Select value={size} onValueChange={setSize}>
            <SelectTrigger className="w-full md:w-[140px]">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sizes</SelectItem>
              {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="w-full md:w-[140px]">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All genders</SelectItem>
              <SelectItem value="men">Men</SelectItem>
              <SelectItem value="women">Women</SelectItem>
              <SelectItem value="unisex">Unisex</SelectItem>
              <SelectItem value="kids">Kids</SelectItem>
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="col-span-2 w-full md:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/50 p-16 text-center">
      <h3 className="font-display text-xl text-foreground">Nothing here yet</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        No items match those filters. Be the first to donate!
      </p>
      <Button asChild className="mt-6">
        <Link to="/donate">Donate clothes</Link>
      </Button>
    </div>
  );
}

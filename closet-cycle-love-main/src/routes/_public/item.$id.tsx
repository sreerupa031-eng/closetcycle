import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ItemCard } from "@/components/ItemCard";
import { ArrowLeft, Check, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_public/item/$id")({
  component: ItemDetail,
});

const conditionLabel: Record<string, string> = {
  new: "New",
  lightly_used: "Lightly used",
  used: "Well loved",
};

function ItemDetail() {
  const { id } = Route.useParams();
  const cart = useCart();
  const [activeImg, setActiveImg] = useState(0);

  const { data: item, isLoading } = useQuery({
    queryKey: ["item", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clothing_items")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // "You may also like" — same gender or category, exclude current
  const { data: related } = useQuery({
    queryKey: ["related", item?.category, item?.gender, id],
    enabled: !!item,
    queryFn: async () => {
      const { data } = await supabase
        .from("clothing_items")
        .select("*")
        .in("status", ["approved", "reserved"])
        .neq("id", id)
        .or(`category.eq.${item!.category},gender.eq.${item!.gender}`)
        .limit(4);
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="aspect-square w-full max-w-xl rounded-2xl" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Item not found</h1>
        <Button asChild className="mt-4"><Link to="/browse">Back to catalog</Link></Button>
      </div>
    );
  }

  const isReserved = item.status === "reserved" || item.status === "delivered";
  const inCart = cart.has(item.id);

  function toggleCart() {
    if (inCart) {
      cart.remove(item!.id);
      toast("Removed from cart");
    } else {
      cart.add(item!.id);
      toast.success("Added to cart");
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Link to="/browse" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to catalog
      </Link>

      <div className="grid gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-muted">
            {item.images?.[activeImg] ? (
              <img src={item.images[activeImg]} alt={item.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
            )}
          </div>
          {item.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {item.images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border ${i === activeImg ? "border-primary" : "border-border"}`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-5">
          <div>
            <Badge variant="secondary" className="mb-3">Free</Badge>
            <h1 className="font-display text-3xl text-foreground md:text-4xl">{item.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{item.category}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Size {item.size}</Badge>
            <Badge variant="outline" className="capitalize">{item.gender}</Badge>
            <Badge variant="outline">{conditionLabel[item.condition]}</Badge>
          </div>

          {item.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          )}

          <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
            Reservations are held for 48 hours. The coordinator will contact you to arrange pickup or delivery.
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              size="lg"
              onClick={toggleCart}
              disabled={isReserved}
              variant={inCart ? "outline" : "default"}
              className="flex-1"
            >
              {isReserved ? "Already reserved" : inCart ? <><Check className="mr-2 h-4 w-4" /> In cart</> : <><ShoppingBag className="mr-2 h-4 w-4" /> Add to cart</>}
            </Button>
            <Button size="lg" variant="outline" asChild className="flex-1">
              <Link to="/cart">Go to cart</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Bundle hint */}
      {related && related.length >= 2 && (
        <div className="mt-12 rounded-2xl border border-dashed border-primary/30 bg-accent/20 p-5 text-sm">
          <span className="font-medium text-primary">Bundle tip:</span>{" "}
          <span className="text-muted-foreground">
            Reserve 3 pieces in one go to help us clear inventory faster.
          </span>
        </div>
      )}

      {/* Related */}
      {related && related.length > 0 && (
        <div className="mt-14">
          <h2 className="font-display text-2xl text-foreground">You may also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4">
            {related.map((r) => <ItemCard key={r.id} item={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}

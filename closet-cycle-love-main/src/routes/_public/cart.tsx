import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, ShoppingBag, Trash2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_public/cart")({
  head: () => ({ meta: [{ title: "Your cart — ClosetCycle" }] }),
  component: CartPage,
});

const schema = z.object({
  receiver_name: z.string().trim().min(1).max(100),
  receiver_phone: z.string().trim().min(7).max(20),
  fulfillment: z.enum(["pickup", "delivery"]),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
});

function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    receiver_name: "",
    receiver_phone: "",
    fulfillment: "pickup" as "pickup" | "delivery",
    address: "",
    notes: "",
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["cart-items", cart.itemIds],
    enabled: cart.itemIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clothing_items")
        .select("*")
        .in("id", cart.itemIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function handleReserve(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (parsed.data.fulfillment === "delivery" && !parsed.data.address) {
      toast.error("Please add a delivery address");
      return;
    }
    if (cart.itemIds.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    setSubmitting(true);
    try {
      // Filter out any items already reserved
      const available = (items ?? []).filter((i) => i.status === "approved");
      if (available.length === 0) {
        toast.error("None of your items are available anymore.");
        setSubmitting(false);
        return;
      }
      const { data: reservation, error: rErr } = await supabase
        .from("reservations")
        .insert({
          ...parsed.data,
          address: parsed.data.address || null,
          notes: parsed.data.notes || null,
        })
        .select()
        .single();
      if (rErr) throw rErr;

      const { error: linkErr } = await supabase.from("reservation_items").insert(
        available.map((i) => ({ reservation_id: reservation.id, item_id: i.id })),
      );
      if (linkErr) throw linkErr;

      cart.clear();
      setDone(true);
    } catch (err) {
      console.error(err);
      toast.error("Could not place reservation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-6 font-display text-3xl text-foreground">Reservation placed!</h1>
        <p className="mt-3 text-muted-foreground">
          The coordinator will reach out shortly to arrange your{" "}
          {form.fulfillment}.
        </p>
        <Button asChild className="mt-8">
          <Link to="/browse">Continue browsing</Link>
        </Button>
      </div>
    );
  }

  if (cart.itemIds.length === 0) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h1 className="mt-6 font-display text-3xl text-foreground">Your cart is empty</h1>
        <p className="mt-3 text-muted-foreground">Browse the catalog to find pieces you love.</p>
        <Button asChild className="mt-8"><Link to="/browse">Browse catalog</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-display text-3xl text-foreground md:text-4xl">Your cart</h1>
      <p className="mt-2 text-muted-foreground">{cart.itemIds.length} item(s)</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-4 rounded-xl border border-border bg-card p-3">
                <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.images?.[0] && <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />}
                </div>
                <div className="flex flex-1 flex-col">
                  <Link to="/item/$id" params={{ id: item.id }} className="font-display text-lg leading-tight hover:underline">
                    {item.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Size {item.size} · {item.category}
                    {item.status !== "approved" && (
                      <span className="ml-2 text-clay">(no longer available)</span>
                    )}
                  </p>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-sm text-primary">Free</span>
                    <Button variant="ghost" size="sm" onClick={() => cart.remove(item.id)} className="text-muted-foreground">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Reservation form */}
        <form onSubmit={handleReserve} className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl text-foreground">Reserve these pieces</h2>

          <div className="space-y-2">
            <Label htmlFor="r_name">Your name</Label>
            <Input id="r_name" value={form.receiver_name} onChange={(e) => setForm({ ...form, receiver_name: e.target.value })} required maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r_phone">Phone</Label>
            <Input id="r_phone" value={form.receiver_phone} onChange={(e) => setForm({ ...form, receiver_phone: e.target.value })} required maxLength={20} />
          </div>

          <div className="space-y-2">
            <Label>How would you like it?</Label>
            <RadioGroup
              value={form.fulfillment}
              onValueChange={(v: "pickup" | "delivery") => setForm({ ...form, fulfillment: v })}
              className="grid grid-cols-2 gap-2"
            >
              <Label htmlFor="pickup" className={`flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 ${form.fulfillment === "pickup" ? "border-primary bg-accent/30" : ""}`}>
                <RadioGroupItem value="pickup" id="pickup" />
                Pickup
              </Label>
              <Label htmlFor="delivery" className={`flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 ${form.fulfillment === "delivery" ? "border-primary bg-accent/30" : ""}`}>
                <RadioGroupItem value="delivery" id="delivery" />
                Delivery
              </Label>
            </RadioGroup>
          </div>

          {form.fulfillment === "delivery" && (
            <div className="space-y-2">
              <Label htmlFor="address">Delivery address</Label>
              <Textarea id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} maxLength={300} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} maxLength={500} />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reserving…</> : "Place reservation"}
          </Button>
        </form>
      </div>
    </div>
  );
}

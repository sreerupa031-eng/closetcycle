// Coordinator dashboard — protected. Sidebar + tabs for Submissions, Inventory, Reservations.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Leaf, LogOut, PackageCheck, Boxes, ClipboardList,
  Check, X as XIcon, ExternalLink,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/coordinator/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ClosetCycle" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, isCoordinator, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isCoordinator)) {
      navigate({ to: "/coordinator/login" });
    }
  }, [user, isCoordinator, loading, navigate]);

  if (loading || !user || !isCoordinator) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-40" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Leaf className="h-5 w-5" />
            </span>
            <div className="flex flex-col leading-none">
              <span className="font-display text-base">ClosetCycle</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Coordinator</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">{user.email}</span>
            <Button variant="outline" size="sm" onClick={() => { signOut(); navigate({ to: "/" }); }}>
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-8">
        <h1 className="font-display text-3xl text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review submissions, manage inventory and confirm reservations.
        </p>

        <StatsRow />

        <Tabs defaultValue="submissions" className="mt-8">
          <TabsList className="bg-secondary/60">
            <TabsTrigger value="submissions"><ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Submissions</TabsTrigger>
            <TabsTrigger value="inventory"><Boxes className="mr-1.5 h-3.5 w-3.5" /> Inventory</TabsTrigger>
            <TabsTrigger value="reservations"><PackageCheck className="mr-1.5 h-3.5 w-3.5" /> Reservations</TabsTrigger>
          </TabsList>
          <TabsContent value="submissions" className="mt-6"><Submissions /></TabsContent>
          <TabsContent value="inventory" className="mt-6"><Inventory /></TabsContent>
          <TabsContent value="reservations" className="mt-6"><Reservations /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatsRow() {
  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [pending, approved, reserved, delivered] = await Promise.all([
        supabase.from("clothing_items").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("clothing_items").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("clothing_items").select("id", { count: "exact", head: true }).eq("status", "reserved"),
        supabase.from("clothing_items").select("id", { count: "exact", head: true }).eq("status", "delivered"),
      ]);
      return {
        pending: pending.count ?? 0,
        approved: approved.count ?? 0,
        reserved: reserved.count ?? 0,
        delivered: delivered.count ?? 0,
      };
    },
  });

  const stats = [
    { label: "Pending review", value: data?.pending ?? 0, tone: "bg-clay/15 text-clay" },
    { label: "Available", value: data?.approved ?? 0, tone: "bg-accent text-primary" },
    { label: "Reserved", value: data?.reserved ?? 0, tone: "bg-secondary text-secondary-foreground" },
    { label: "Delivered", value: data?.delivered ?? 0, tone: "bg-muted text-muted-foreground" },
  ];

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
          <p className="mt-2 font-display text-3xl text-foreground">{s.value}</p>
        </Card>
      ))}
    </div>
  );
}

type Item = Tables<"clothing_items">;

function Submissions() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clothing_items")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function update(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("clothing_items").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "approved" ? "Approved & published" : "Rejected");
    qc.invalidateQueries({ queryKey: ["submissions"] });
    qc.invalidateQueries({ queryKey: ["inventory"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data || data.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No pending submissions. You're all caught up 🌿</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <Card key={item.id} className="overflow-hidden p-0">
          <div className="flex flex-col gap-4 p-4 sm:flex-row">
            <div className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
              {item.images?.[0] ? (
                <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
              )}
            </div>
            <div className="flex flex-1 flex-col">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg text-foreground">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    From {item.donor_name} · {item.donor_phone}
                  </p>
                </div>
                <Badge className="bg-clay/15 text-clay">Pending</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline">{item.category}</Badge>
                <Badge variant="outline">Size {item.size}</Badge>
                <Badge variant="outline" className="capitalize">{item.gender}</Badge>
                <Badge variant="outline">{item.condition.replace("_", " ")}</Badge>
              </div>
              {item.description && (
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              )}
              {item.images.length > 1 && (
                <div className="mt-2 flex gap-1.5">
                  {item.images.slice(1).map((src, i) => (
                    <img key={i} src={src} alt="" className="h-12 w-12 rounded object-cover" />
                  ))}
                </div>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                <Button size="sm" onClick={() => update(item.id, "approved")}>
                  <Check className="mr-1.5 h-3.5 w-3.5" /> Approve & publish
                </Button>
                <Button size="sm" variant="outline" onClick={() => update(item.id, "rejected")}>
                  <XIcon className="mr-1.5 h-3.5 w-3.5" /> Reject
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "approved", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "delivered", label: "Delivered" },
  { value: "rejected", label: "Rejected" },
];

function Inventory() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", filter],
    queryFn: async () => {
      let q = supabase.from("clothing_items").select("*").neq("status", "pending").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: Item["status"]) {
    const { error } = await supabase.from("clothing_items").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["inventory"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{data?.length ?? 0} items</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">No items here.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((item) => (
            <Card key={item.id} className="overflow-hidden p-0">
              <div className="flex gap-3 p-3">
                <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded bg-muted">
                  {item.images?.[0] && <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />}
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base leading-tight">{item.title}</h3>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.category} · Size {item.size} · {item.gender}
                  </p>
                  <div className="mt-auto flex items-center gap-2 pt-2">
                    <Select value={item.status} onValueChange={(v) => setStatus(item.id, v as Item["status"])}>
                      <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Available</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/item/$id" params={{ id: item.id }}><ExternalLink className="h-3.5 w-3.5" /></Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-accent text-primary",
    reserved: "bg-clay/15 text-clay",
    delivered: "bg-secondary text-secondary-foreground",
    rejected: "bg-destructive/10 text-destructive",
    pending: "bg-muted text-muted-foreground",
  };
  return <Badge className={`${map[status] ?? ""} capitalize`}>{status}</Badge>;
}

function Reservations() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["reservations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, reservation_items(item_id, clothing_items(id, title, images, size))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("reservations").update({ status: status as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    // If confirmed/delivered, mark items reserved/delivered
    if (status === "confirmed" || status === "delivered") {
      const r = data?.find((x) => x.id === id);
      const itemIds = r?.reservation_items.map((ri: any) => ri.item_id) ?? [];
      if (itemIds.length) {
        await supabase
          .from("clothing_items")
          .update({ status: status === "delivered" ? "delivered" : "reserved" })
          .in("id", itemIds);
      }
    }
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["reservations"] });
    qc.invalidateQueries({ queryKey: ["inventory"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data || data.length === 0) {
    return <Card className="p-12 text-center text-muted-foreground">No reservations yet.</Card>;
  }

  return (
    <div className="space-y-3">
      {data.map((r: any) => (
        <Card key={r.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg">{r.receiver_name}</h3>
              <p className="text-xs text-muted-foreground">
                {r.receiver_phone} · {r.fulfillment}
                {r.address && ` · ${r.address}`}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
            <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {r.reservation_items.map((ri: any) => (
              <Link
                key={ri.item_id}
                to="/item/$id"
                params={{ id: ri.item_id }}
                className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2 pr-3 text-sm hover:bg-accent"
              >
                {ri.clothing_items?.images?.[0] ? (
                  <img src={ri.clothing_items.images[0]} alt="" className="h-10 w-10 rounded object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted" />
                )}
                <span>
                  <span className="block font-medium leading-tight">{ri.clothing_items?.title}</span>
                  <span className="text-xs text-muted-foreground">Size {ri.clothing_items?.size}</span>
                </span>
              </Link>
            ))}
          </div>

          {r.notes && (
            <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Note:</span> {r.notes}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}

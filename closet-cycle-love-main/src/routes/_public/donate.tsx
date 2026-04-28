import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload, X, MessageCircle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_public/donate")({
  head: () => ({
    meta: [
      { title: "Donate clothes — ClosetCycle" },
      {
        name: "description",
        content:
          "Donate clothes you no longer wear in under 2 minutes. No login required — just a quick form and a few photos.",
      },
      { property: "og:title", content: "Donate clothes — ClosetCycle" },
    ],
  }),
  component: DonatePage,
});

const schema = z.object({
  donor_name: z.string().trim().min(1, "Name is required").max(100),
  donor_phone: z.string().trim().min(7, "Enter a valid phone").max(20),
  title: z.string().trim().min(1, "Item title is required").max(120),
  category: z.string().trim().min(1, "Category is required").max(60),
  size: z.string().trim().min(1, "Size is required").max(10),
  gender: z.enum(["men", "women", "unisex", "kids"]),
  condition: z.enum(["new", "lightly_used", "used"]),
  description: z.string().trim().max(500).optional(),
});

// Update this to your local coordinator number to enable real WhatsApp routing.
const COORDINATOR_WHATSAPP = "10000000000";

function DonatePage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    donor_name: "",
    donor_phone: "",
    title: "",
    category: "Shirt",
    size: "M",
    gender: "unisex" as "men" | "women" | "unisex" | "kids",
    condition: "lightly_used" as "new" | "lightly_used" | "used",
    description: "",
  });

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const next: File[] = [];
    const nextPreviews: string[] = [];
    Array.from(list)
      .slice(0, 5 - files.length)
      .forEach((f) => {
        if (f.size > 5 * 1024 * 1024) {
          toast.error(`${f.name} is over 5MB`);
          return;
        }
        next.push(f);
        nextPreviews.push(URL.createObjectURL(f));
      });
    setFiles((p) => [...p, ...next]);
    setPreviews((p) => [...p, ...nextPreviews]);
  }

  function removeFile(i: number) {
    setFiles((p) => p.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  }

  async function uploadImages(): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("clothing-images")
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("clothing-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      const images = files.length > 0 ? await uploadImages() : [];
      const { error } = await supabase.from("clothing_items").insert({
        ...parsed.data,
        description: parsed.data.description || null,
        images,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Thanks! Your donation is awaiting review.");
      setSuccess(true);
    } catch (err) {
      console.error(err);
      toast.error("Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function whatsappLink() {
    const msg = `Hi! I'd like to donate clothes via ClosetCycle.

Item: ${form.title || "(item name)"}
Category: ${form.category}
Size: ${form.size}
Condition: ${form.condition.replace("_", " ")}

My name: ${form.donor_name || "(your name)"}
My phone: ${form.donor_phone || "(your phone)"}`;
    return `https://wa.me/${COORDINATOR_WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }

  if (success) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-6 font-display text-3xl text-foreground">Thank you!</h1>
        <p className="mt-3 text-muted-foreground">
          Your donation has been submitted. The coordinator will review it and
          contact you about pickup if approved.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/">Back home</Link>
          </Button>
          <Button asChild>
            <Link to="/browse">Browse the catalog</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-foreground md:text-4xl">
          Donate a piece
        </h1>
        <p className="mt-2 text-muted-foreground">
          No login needed. Takes about 2 minutes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Your name" htmlFor="donor_name">
            <Input
              id="donor_name"
              value={form.donor_name}
              onChange={(e) => setForm({ ...form, donor_name: e.target.value })}
              placeholder="Asha"
              maxLength={100}
              required
            />
          </Field>
          <Field label="Phone number" htmlFor="donor_phone">
            <Input
              id="donor_phone"
              value={form.donor_phone}
              onChange={(e) => setForm({ ...form, donor_phone: e.target.value })}
              placeholder="+91 98765 43210"
              maxLength={20}
              required
            />
          </Field>
        </div>

        <Field label="What are you donating?" htmlFor="title">
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Cream linen shirt"
            maxLength={120}
            required
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Category" htmlFor="category">
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger id="category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Shirt", "T-shirt", "Jeans", "Trousers", "Dress", "Kurta", "Jacket", "Sweater", "Skirt", "Shoes", "Other"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Size" htmlFor="size">
            <Select value={form.size} onValueChange={(v) => setForm({ ...form, size: v })}>
              <SelectTrigger id="size"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Gender" htmlFor="gender">
            <Select value={form.gender} onValueChange={(v: typeof form.gender) => setForm({ ...form, gender: v })}>
              <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="men">Men</SelectItem>
                <SelectItem value="women">Women</SelectItem>
                <SelectItem value="unisex">Unisex</SelectItem>
                <SelectItem value="kids">Kids</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Condition" htmlFor="condition">
          <Select value={form.condition} onValueChange={(v: typeof form.condition) => setForm({ ...form, condition: v })}>
            <SelectTrigger id="condition"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New / unworn</SelectItem>
              <SelectItem value="lightly_used">Lightly used</SelectItem>
              <SelectItem value="used">Used but loved</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Notes (optional)" htmlFor="description">
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Anything the coordinator should know"
            maxLength={500}
            rows={3}
          />
        </Field>

        <Field label={`Photos (up to 5)`} htmlFor="files">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground hover:bg-background"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {files.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/50 text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
                >
                  <Upload className="h-4 w-4" />
                  Add
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              id="files"
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </Field>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : "Submit donation"}
          </Button>
          <Button type="button" variant="outline" asChild className="flex-1">
            <a href={whatsappLink()} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" /> Submit via WhatsApp
            </a>
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

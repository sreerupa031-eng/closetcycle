-- Roles
CREATE TYPE public.app_role AS ENUM ('coordinator');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-assign coordinator role to first signed-up user, otherwise nothing
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First registered user becomes coordinator
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'coordinator') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'coordinator');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Item status enum
CREATE TYPE public.item_status AS ENUM ('pending', 'approved', 'reserved', 'delivered', 'rejected');
CREATE TYPE public.gender_category AS ENUM ('men', 'women', 'unisex', 'kids');
CREATE TYPE public.item_condition AS ENUM ('new', 'lightly_used', 'used');
CREATE TYPE public.reservation_status AS ENUM ('pending', 'confirmed', 'delivered', 'cancelled');
CREATE TYPE public.fulfillment_type AS ENUM ('pickup', 'delivery');

-- Clothing items
CREATE TABLE public.clothing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  size TEXT NOT NULL,
  gender public.gender_category NOT NULL DEFAULT 'unisex',
  condition public.item_condition NOT NULL DEFAULT 'lightly_used',
  images TEXT[] NOT NULL DEFAULT '{}',
  donor_name TEXT NOT NULL,
  donor_phone TEXT NOT NULL,
  status public.item_status NOT NULL DEFAULT 'pending',
  coordinator_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clothing_items ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a donation
CREATE POLICY "Anyone can submit donations" ON public.clothing_items
FOR INSERT TO anon, authenticated
WITH CHECK (status = 'pending');

-- Public can view approved/reserved/delivered items
CREATE POLICY "Public can view approved items" ON public.clothing_items
FOR SELECT TO anon, authenticated
USING (status IN ('approved', 'reserved', 'delivered'));

-- Coordinators can do everything
CREATE POLICY "Coordinators view all items" ON public.clothing_items
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'coordinator'));

CREATE POLICY "Coordinators update items" ON public.clothing_items
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'coordinator'));

CREATE POLICY "Coordinators delete items" ON public.clothing_items
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'coordinator'));

-- Reservations
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT NOT NULL,
  fulfillment public.fulfillment_type NOT NULL DEFAULT 'pickup',
  address TEXT,
  notes TEXT,
  status public.reservation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create reservations" ON public.reservations
FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Coordinators view reservations" ON public.reservations
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'coordinator'));

CREATE POLICY "Coordinators update reservations" ON public.reservations
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'coordinator'));

-- Reservation items (junction)
CREATE TABLE public.reservation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reservation_id, item_id)
);

ALTER TABLE public.reservation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create reservation items" ON public.reservation_items
FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Coordinators view reservation items" ON public.reservation_items
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'coordinator'));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER items_updated_at BEFORE UPDATE ON public.clothing_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket for clothing images
INSERT INTO storage.buckets (id, name, public)
VALUES ('clothing-images', 'clothing-images', true);

CREATE POLICY "Public read clothing images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'clothing-images');

CREATE POLICY "Anyone can upload clothing images"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'clothing-images');

CREATE POLICY "Coordinators can delete clothing images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'clothing-images' AND public.has_role(auth.uid(), 'coordinator'));
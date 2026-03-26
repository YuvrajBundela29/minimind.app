
-- Create usage_logs table
CREATE TABLE public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  query_text text,
  mode text,
  language text,
  response_length integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own usage logs"
ON public.usage_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own usage logs"
ON public.usage_logs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Create saved_notes table
CREATE TABLE public.saved_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  query_text text,
  response_text text,
  mode text,
  language text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own saved notes"
ON public.saved_notes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own saved notes"
ON public.saved_notes FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved notes"
ON public.saved_notes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_usage_logs_user_created ON public.usage_logs (user_id, created_at DESC);
CREATE INDEX idx_saved_notes_user_created ON public.saved_notes (user_id, created_at DESC);

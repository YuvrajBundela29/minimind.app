CREATE TABLE IF NOT EXISTS public.user_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_history_user_created_at
  ON public.user_history (user_id, created_at DESC);

ALTER TABLE public.user_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_history'
      AND policyname = 'Users can view their own history'
  ) THEN
    CREATE POLICY "Users can view their own history"
      ON public.user_history
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_history'
      AND policyname = 'Users can insert their own history'
  ) THEN
    CREATE POLICY "Users can insert their own history"
      ON public.user_history
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_history'
      AND policyname = 'Users can delete their own history'
  ) THEN
    CREATE POLICY "Users can delete their own history"
      ON public.user_history
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
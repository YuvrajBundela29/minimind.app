-- Ensure one certificate per user per achievement/path
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_user_learning_path_unique
ON public.certificates(user_id, learning_path_id);

-- Auto-issue certificates when a badge is unlocked
CREATE OR REPLACE FUNCTION public.issue_badge_certificate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement_name text;
  v_certificate_code text;
  v_learning_path_id text;
BEGIN
  v_learning_path_id := 'badge:' || NEW.achievement_id::text;

  IF EXISTS (
    SELECT 1
    FROM public.certificates
    WHERE user_id = NEW.user_id
      AND learning_path_id = v_learning_path_id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT name
  INTO v_achievement_name
  FROM public.achievements
  WHERE id = NEW.achievement_id;

  IF v_achievement_name IS NULL THEN
    v_achievement_name := 'Achievement';
  END IF;

  v_certificate_code :=
    'MINI-CERT-' ||
    UPPER(SUBSTRING(REPLACE(NEW.user_id::text, '-', '') FROM 1 FOR 8)) ||
    '-BDG-' ||
    TO_CHAR(CURRENT_DATE, 'YYYYMMDD') ||
    '-' ||
    UPPER(SUBSTRING(MD5(NEW.achievement_id::text || NOW()::text) FROM 1 FOR 4));

  INSERT INTO public.certificates (
    user_id,
    learning_path_id,
    learning_path_name,
    mastery_score,
    certificate_code
  )
  VALUES (
    NEW.user_id,
    v_learning_path_id,
    'Badge: ' || v_achievement_name,
    100,
    v_certificate_code
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_issue_badge_certificate ON public.user_achievements;
CREATE TRIGGER trg_issue_badge_certificate
AFTER INSERT ON public.user_achievements
FOR EACH ROW
EXECUTE FUNCTION public.issue_badge_certificate();
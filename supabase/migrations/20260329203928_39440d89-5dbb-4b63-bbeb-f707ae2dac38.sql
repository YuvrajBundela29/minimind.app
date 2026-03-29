
-- Referral codes table
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own referral code"
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referrer_rewarded boolean NOT NULL DEFAULT false,
  referred_rewarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referrals they made"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

-- Function to apply a referral code
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referrer_id uuid;
  v_current_user uuid;
  v_referral_count integer;
  v_reward_credits integer := 50;
  v_milestone_bonus integer := 0;
BEGIN
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Find referrer by code
  SELECT user_id INTO v_referrer_id
  FROM public.referral_codes
  WHERE code = p_code;

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'invalid_code');
  END IF;

  -- Cannot refer yourself
  IF v_referrer_id = v_current_user THEN
    RETURN json_build_object('success', false, 'error', 'self_referral');
  END IF;

  -- Check if already referred
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = v_current_user) THEN
    RETURN json_build_object('success', false, 'error', 'already_referred');
  END IF;

  -- Create referral record
  INSERT INTO public.referrals (referrer_id, referred_id, referrer_rewarded, referred_rewarded)
  VALUES (v_referrer_id, v_current_user, true, true);

  -- Reward referred user: reduce daily_used (effectively giving free credits)
  UPDATE public.user_subscriptions
  SET credits_daily_used = GREATEST(0, credits_daily_used - v_reward_credits)
  WHERE user_id = v_current_user;

  -- Reward referrer
  UPDATE public.user_subscriptions
  SET credits_daily_used = GREATEST(0, credits_daily_used - v_reward_credits)
  WHERE user_id = v_referrer_id;

  -- Check milestone bonuses for referrer
  SELECT count(*) INTO v_referral_count
  FROM public.referrals
  WHERE referrer_id = v_referrer_id;

  -- 5 referrals = +200 bonus credits
  IF v_referral_count = 5 THEN
    v_milestone_bonus := 200;
    UPDATE public.user_subscriptions
    SET credits_daily_used = GREATEST(0, credits_daily_used - v_milestone_bonus)
    WHERE user_id = v_referrer_id;
  END IF;

  -- 20 referrals = unlock 1 month Pro
  IF v_referral_count = 20 THEN
    UPDATE public.user_subscriptions
    SET tier = 'pro',
        status = 'active',
        current_period_start = now(),
        current_period_end = now() + interval '30 days'
    WHERE user_id = v_referrer_id;
    v_milestone_bonus := -1; -- signal pro unlock
  END IF;

  RETURN json_build_object(
    'success', true,
    'reward_credits', v_reward_credits,
    'milestone_bonus', v_milestone_bonus,
    'referral_count', v_referral_count
  );
END;
$$;

-- Function to get or create referral code for current user
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_code text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT code INTO v_code
  FROM public.referral_codes
  WHERE user_id = v_user_id;

  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  -- Generate unique 8-char code
  v_code := upper(substring(md5(v_user_id::text || now()::text) from 1 for 8));
  
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (v_user_id, v_code)
  ON CONFLICT (code) DO NOTHING;

  -- If conflict, try again with different seed
  IF NOT FOUND THEN
    v_code := upper(substring(md5(v_user_id::text || random()::text) from 1 for 8));
    INSERT INTO public.referral_codes (user_id, code)
    VALUES (v_user_id, v_code);
  END IF;

  RETURN v_code;
END;
$$;

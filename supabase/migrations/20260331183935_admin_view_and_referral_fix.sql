-- Add bonus_credits column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_subscriptions' AND column_name = 'bonus_credits'
  ) THEN
    ALTER TABLE public.user_subscriptions ADD COLUMN bonus_credits integer DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Create the admin view joining users, profiles, history, and referrals
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
  au.id,
  au.email,
  au.last_sign_in_at,
  p.display_name,
  p.avatar_url,
  p.created_at AS profile_created_at,
  COALESCE(h.total_questions, 0) AS total_questions_asked,
  COALESCE(r.total_referrals, 0) AS total_referrals_attracted
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as total_questions 
  FROM public.user_history 
  GROUP BY user_id
) h ON au.id = h.user_id
LEFT JOIN (
  SELECT referrer_id, COUNT(*) as total_referrals
  FROM public.referrals
  GROUP BY referrer_id
) r ON au.id = r.referrer_id;

-- Update completely rewritten apply_referral_code to properly grant 50 bonus_credits
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

  SELECT user_id INTO v_referrer_id
  FROM public.referral_codes
  WHERE code = p_code;

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF v_referrer_id = v_current_user THEN
    RETURN json_build_object('success', false, 'error', 'self_referral');
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = v_current_user) THEN
    RETURN json_build_object('success', false, 'error', 'already_referred');
  END IF;

  INSERT INTO public.referrals (referrer_id, referred_id, referrer_rewarded, referred_rewarded)
  VALUES (v_referrer_id, v_current_user, true, true);

  -- Add 50 bonus credits directly to both users' durable banks
  UPDATE public.user_subscriptions
  SET bonus_credits = bonus_credits + v_reward_credits
  WHERE user_id = v_current_user;

  UPDATE public.user_subscriptions
  SET bonus_credits = bonus_credits + v_reward_credits
  WHERE user_id = v_referrer_id;

  SELECT count(*) INTO v_referral_count
  FROM public.referrals
  WHERE referrer_id = v_referrer_id;

  -- Apply 200 milestone bonus straight into bonus_credits
  IF v_referral_count = 5 THEN
    v_milestone_bonus := 200;
    UPDATE public.user_subscriptions
    SET bonus_credits = bonus_credits + v_milestone_bonus
    WHERE user_id = v_referrer_id;
  END IF;

  IF v_referral_count = 20 THEN
    UPDATE public.user_subscriptions
    SET tier = 'pro',
        status = 'active',
        current_period_start = now(),
        current_period_end = now() + interval '30 days'
    WHERE user_id = v_referrer_id;
    v_milestone_bonus := -1; 
  END IF;

  RETURN json_build_object(
    'success', true,
    'reward_credits', v_reward_credits,
    'milestone_bonus', v_milestone_bonus,
    'referral_count', v_referral_count
  );
END;
$$;


-- Update deduct_user_credit to transparently drain from bonus_credits if regular ones are empty
CREATE OR REPLACE FUNCTION public.deduct_user_credit(p_user_id uuid, p_cost integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tier subscription_tier;
  v_daily_used integer;
  v_monthly_used integer;
  v_bonus_available integer;
  v_last_daily_reset date;
  v_last_monthly_reset date;
  v_daily_limit integer;
  v_monthly_limit integer;
  v_daily_available integer;
  v_monthly_available integer;
  v_total_available integer;
  v_from_daily integer;
  v_from_monthly integer;
  v_from_bonus integer;
  v_remaining_cost integer;
  v_new_daily_used integer;
  v_new_monthly_used integer;
BEGIN
  -- Get current subscription state
  SELECT tier, credits_daily_used, credits_monthly_used, credits_last_daily_reset, credits_last_monthly_reset, bonus_credits
  INTO v_tier, v_daily_used, v_monthly_used, v_last_daily_reset, v_last_monthly_reset, v_bonus_available
  FROM public.user_subscriptions
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'no_subscription');
  END IF;

  -- Determine limits
  CASE v_tier
    WHEN 'free' THEN v_daily_limit := 15; v_monthly_limit := 0;
    WHEN 'plus' THEN v_daily_limit := 50; v_monthly_limit := 500;
    WHEN 'pro' THEN v_daily_limit := 100; v_monthly_limit := 1000;
    ELSE v_daily_limit := 15; v_monthly_limit := 0;
  END CASE;

  -- Auto-reset daily
  IF v_last_daily_reset IS NULL OR v_last_daily_reset < CURRENT_DATE THEN
    v_daily_used := 0;
    v_last_daily_reset := CURRENT_DATE;
  END IF;

  -- Auto-reset monthly
  IF v_last_monthly_reset IS NULL OR (date_trunc('month', v_last_monthly_reset::timestamp) < date_trunc('month', CURRENT_DATE::timestamp)) THEN
    v_monthly_used := 0;
    v_last_monthly_reset := CURRENT_DATE;
  END IF;

  v_daily_available := GREATEST(0, v_daily_limit - v_daily_used);
  v_monthly_available := GREATEST(0, v_monthly_limit - v_monthly_used);
  v_bonus_available := COALESCE(v_bonus_available, 0);
  
  -- The grand total adds the fallback bonus credits!
  v_total_available := v_daily_available + v_monthly_available + v_bonus_available;

  IF p_cost = 0 THEN
    IF v_total_available <= 0 THEN
      RETURN json_build_object('success', false, 'error', 'credits_exhausted', 'tier', v_tier::text, 'credits_remaining', 0);
    END IF;
    RETURN json_build_object('success', true, 'credits_remaining', v_total_available, 'daily_remaining', v_daily_available, 'monthly_remaining', v_monthly_available, 'bonus_remaining', v_bonus_available, 'tier', v_tier::text);
  END IF;

  IF v_total_available < p_cost THEN
    RETURN json_build_object('success', false, 'error', 'credits_exhausted', 'tier', v_tier::text, 'credits_remaining', v_total_available);
  END IF;

  v_remaining_cost := p_cost;
  
  -- 1) Deduct from daily limit first
  v_from_daily := LEAST(v_remaining_cost, v_daily_available);
  v_remaining_cost := v_remaining_cost - v_from_daily;
  v_new_daily_used := v_daily_used + v_from_daily;

  -- 2) Then from monthly limit
  v_from_monthly := LEAST(v_remaining_cost, v_monthly_available);
  v_remaining_cost := v_remaining_cost - v_from_monthly;
  v_new_monthly_used := v_monthly_used + v_from_monthly;

  -- 3) Finally, deduct strictly from bonus_credits if still remaining
  v_from_bonus := LEAST(v_remaining_cost, v_bonus_available);
  v_remaining_cost := v_remaining_cost - v_from_bonus;
  v_bonus_available := v_bonus_available - v_from_bonus;

  UPDATE public.user_subscriptions
  SET credits_daily_used = v_new_daily_used,
      credits_monthly_used = v_new_monthly_used,
      bonus_credits = v_bonus_available,
      credits_last_daily_reset = v_last_daily_reset,
      credits_last_monthly_reset = v_last_monthly_reset,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'credits_remaining', v_total_available - p_cost,
    'daily_remaining', v_daily_limit - v_new_daily_used,
    'monthly_remaining', v_monthly_limit - v_new_monthly_used,
    'bonus_remaining', v_bonus_available,
    'tier', v_tier::text
  );
END;
$$;

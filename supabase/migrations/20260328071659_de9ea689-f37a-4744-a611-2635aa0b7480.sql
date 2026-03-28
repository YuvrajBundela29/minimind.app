
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
  v_last_daily_reset date;
  v_last_monthly_reset date;
  v_daily_limit integer;
  v_monthly_limit integer;
  v_daily_available integer;
  v_monthly_available integer;
  v_total_available integer;
  v_from_daily integer;
  v_from_monthly integer;
  v_remaining_cost integer;
  v_new_daily_used integer;
  v_new_monthly_used integer;
BEGIN
  -- Get current subscription state
  SELECT tier, credits_daily_used, credits_monthly_used, credits_last_daily_reset, credits_last_monthly_reset
  INTO v_tier, v_daily_used, v_monthly_used, v_last_daily_reset, v_last_monthly_reset
  FROM public.user_subscriptions
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'no_subscription');
  END IF;

  -- Determine limits based on tier
  CASE v_tier
    WHEN 'free' THEN v_daily_limit := 15; v_monthly_limit := 0;
    WHEN 'plus' THEN v_daily_limit := 50; v_monthly_limit := 500;
    WHEN 'pro' THEN v_daily_limit := 100; v_monthly_limit := 1000;
    ELSE v_daily_limit := 15; v_monthly_limit := 0;
  END CASE;

  -- Auto-reset daily if new day
  IF v_last_daily_reset IS NULL OR v_last_daily_reset < CURRENT_DATE THEN
    v_daily_used := 0;
    v_last_daily_reset := CURRENT_DATE;
  END IF;

  -- Auto-reset monthly if new month
  IF v_last_monthly_reset IS NULL OR (date_trunc('month', v_last_monthly_reset::timestamp) < date_trunc('month', CURRENT_DATE::timestamp)) THEN
    v_monthly_used := 0;
    v_last_monthly_reset := CURRENT_DATE;
  END IF;

  -- Calculate available
  v_daily_available := GREATEST(0, v_daily_limit - v_daily_used);
  v_monthly_available := GREATEST(0, v_monthly_limit - v_monthly_used);
  v_total_available := v_daily_available + v_monthly_available;

  -- Pre-check mode (p_cost = 0): just return availability
  IF p_cost = 0 THEN
    IF v_total_available <= 0 THEN
      RETURN json_build_object('success', false, 'error', 'credits_exhausted', 'tier', v_tier::text, 'credits_remaining', 0);
    END IF;
    RETURN json_build_object('success', true, 'credits_remaining', v_total_available, 'daily_remaining', v_daily_available, 'monthly_remaining', v_monthly_available, 'tier', v_tier::text);
  END IF;

  -- Check sufficient credits
  IF v_total_available < p_cost THEN
    RETURN json_build_object('success', false, 'error', 'credits_exhausted', 'tier', v_tier::text, 'credits_remaining', v_total_available);
  END IF;

  -- Deduct from daily first, then monthly
  v_remaining_cost := p_cost;
  v_from_daily := LEAST(v_remaining_cost, v_daily_available);
  v_remaining_cost := v_remaining_cost - v_from_daily;
  v_from_monthly := LEAST(v_remaining_cost, v_monthly_available);

  v_new_daily_used := v_daily_used + v_from_daily;
  v_new_monthly_used := v_monthly_used + v_from_monthly;

  -- Persist
  UPDATE public.user_subscriptions
  SET credits_daily_used = v_new_daily_used,
      credits_monthly_used = v_new_monthly_used,
      credits_last_daily_reset = v_last_daily_reset,
      credits_last_monthly_reset = v_last_monthly_reset,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'credits_remaining', (v_daily_limit - v_new_daily_used) + (v_monthly_limit - v_new_monthly_used),
    'daily_remaining', v_daily_limit - v_new_daily_used,
    'monthly_remaining', v_monthly_limit - v_new_monthly_used,
    'tier', v_tier::text
  );
END;
$$;

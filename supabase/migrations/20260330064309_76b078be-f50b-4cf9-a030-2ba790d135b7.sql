
-- Create a refund function for when AI calls fail after credit deduction
CREATE OR REPLACE FUNCTION public.refund_user_credit(p_user_id uuid, p_cost integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_daily_used integer;
  v_monthly_used integer;
  v_daily_limit integer;
  v_monthly_limit integer;
  v_tier subscription_tier;
  v_refund_to_monthly integer;
  v_refund_to_daily integer;
  v_remaining_refund integer;
BEGIN
  SELECT tier, credits_daily_used, credits_monthly_used
  INTO v_tier, v_daily_used, v_monthly_used
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

  -- Refund in reverse order: monthly first, then daily
  v_remaining_refund := p_cost;
  v_refund_to_monthly := LEAST(v_remaining_refund, v_monthly_used);
  v_remaining_refund := v_remaining_refund - v_refund_to_monthly;
  v_refund_to_daily := LEAST(v_remaining_refund, v_daily_used);

  UPDATE public.user_subscriptions
  SET credits_daily_used = credits_daily_used - v_refund_to_daily,
      credits_monthly_used = credits_monthly_used - v_refund_to_monthly,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'credits_remaining', (v_daily_limit - (v_daily_used - v_refund_to_daily)) + (v_monthly_limit - (v_monthly_used - v_refund_to_monthly)),
    'daily_remaining', v_daily_limit - (v_daily_used - v_refund_to_daily),
    'monthly_remaining', v_monthly_limit - (v_monthly_used - v_refund_to_monthly),
    'refunded', p_cost
  );
END;
$function$;

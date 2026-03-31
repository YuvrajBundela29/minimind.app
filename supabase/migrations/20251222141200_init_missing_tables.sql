-- Reconstruct missing Enums
CREATE TYPE public.plan_type AS ENUM ('monthly', 'yearly');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'expired', 'pending');
CREATE TYPE public.subscription_tier AS ENUM ('free', 'plus', 'pro');

-- Reconstruct missing user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    tier public.subscription_tier NOT NULL DEFAULT 'free',
    status public.subscription_status NOT NULL DEFAULT 'active',
    plan_type public.plan_type,
    current_period_start timestamptz,
    current_period_end timestamptz,
    grace_period_end timestamptz,
    credits_daily_used integer NOT NULL DEFAULT 0,
    credits_monthly_used integer NOT NULL DEFAULT 0,
    credits_last_daily_reset date,
    credits_last_monthly_reset date,
    daily_questions_used integer,
    last_question_reset date,
    razorpay_customer_id text,
    razorpay_subscription_id text,
    razorpay_order_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Reconstruct missing user_streaks table
CREATE TABLE IF NOT EXISTS public.user_streaks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    current_streak integer NOT NULL DEFAULT 0,
    longest_streak integer NOT NULL DEFAULT 0,
    last_activity_date date,
    streak_shields integer NOT NULL DEFAULT 0,
    level integer NOT NULL DEFAULT 1,
    xp integer NOT NULL DEFAULT 0,
    streak_updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

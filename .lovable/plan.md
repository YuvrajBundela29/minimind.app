

## Fix: Credits Not Deducting When Using the App

### Root Cause

The `useCredits` function in `SubscriptionContext.tsx` reads `subscription.credits.dailyUsed` from a **stale closure**. When `handleSubmit` in `Index.tsx` calls `useCredits` four times in a `for` loop (once per mode), each call reads the same base value because React state hasn't re-rendered between iterations.

Example: if `dailyUsed` starts at 0 and costs are 1, 2, 3, 4:
- Call 1: `newDailyUsed = 0 + 1 = 1` → writes 1 to DB
- Call 2: `newDailyUsed = 0 + 2 = 2` → **overwrites** DB with 2 (should be 3)
- Call 3: `newDailyUsed = 0 + 3 = 3` → **overwrites** DB with 3 (should be 6)
- Call 4: `newDailyUsed = 0 + 4 = 4` → **overwrites** DB with 4 (should be 10)

Only the last mode's cost is effectively applied, and on refresh the DB value resets everything.

### Fix (2 files)

**1. `src/contexts/SubscriptionContext.tsx`** — Use a **ref** to track cumulative credit usage so multiple rapid calls within one render cycle accumulate correctly:

- Add a `creditsRef` that mirrors `subscription.credits` and stays in sync via `useEffect`
- In `useCredits`, read from `creditsRef.current` instead of `subscription.credits`
- After computing new values, update **both** the ref (immediately) and state (via setter)
- This ensures call 2 sees the result of call 1, even without a re-render

**2. `src/pages/Index.tsx`** — No changes needed if the ref fix works correctly. The existing for-loop + `await useCredits(cost, modeKey)` pattern will now accumulate properly since the ref updates synchronously.

### Technical Detail

```text
Before (broken):
  useCredits(1) → reads state.dailyUsed=0 → sets 1
  useCredits(2) → reads state.dailyUsed=0 → sets 2  ← STALE!
  
After (fixed):  
  useCredits(1) → reads ref.dailyUsed=0 → sets ref=1, state=1
  useCredits(2) → reads ref.dailyUsed=1 → sets ref=3, state=3  ← CORRECT
```

### Changes Summary

| File | Change |
|------|--------|
| `SubscriptionContext.tsx` | Add `creditsRef` to track credit state synchronously; update `useCredits` and `hasCredits`/`getCredits` to read from ref for real-time accuracy |


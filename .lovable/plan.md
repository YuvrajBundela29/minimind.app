

# Fix "Free" Labels and Enable Credit Deduction

## Problem
Two issues:
1. Every mode card and feature shows "Free" instead of credit costs
2. Credits are never deducted because early access mode bypasses all credit checks

## Root Cause
In `src/contexts/EarlyAccessContext.tsx`, `isEarlyAccess` is set to `true` and `unlimitedCredits` is `true`. Every component checks these flags and either shows "Free" or skips credit deduction entirely.

## Changes

### 1. `src/contexts/EarlyAccessContext.tsx` -- Disable early access mode
- Set `isEarlyAccess: false` and `unlimitedCredits: false` so the credit system is active

### 2. `src/components/ModeCard.tsx` -- Show credit cost instead of "Free"
- Line 118: Change `{isEarlyAccess ? 'Free' : creditCost}` to always show the credit cost with a label like `1 credit`

### 3. `src/components/TrustFooter.tsx` -- Show credit cost instead of "Free (Early Access)"
- Lines 45-47: Remove the early access conditional and always show the actual credit cost

### 4. `src/components/pages/EkaksharPage.tsx` -- Remove early access bypass
- Remove `if (!isEarlyAccess && ...)` guards so credits are always checked and deducted
- Remove the "Free" badge that shows during early access

### 5. `src/components/pages/ExplainBackPage.tsx` -- Remove "Free" badge
- Remove the early access "Free" badge

### 6. `src/components/pages/LearningPathPage.tsx` -- Remove early access bypass
- Remove `if (!isEarlyAccess && ...)` guards from `generatePath` and `loadTopicExplanation`
- Remove the early access conditional from the disabled button check

### Files to modify
1. `src/contexts/EarlyAccessContext.tsx`
2. `src/components/ModeCard.tsx`
3. `src/components/TrustFooter.tsx`
4. `src/components/pages/EkaksharPage.tsx`
5. `src/components/pages/ExplainBackPage.tsx`
6. `src/components/pages/LearningPathPage.tsx`


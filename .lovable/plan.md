

## Plan: Fix Build Errors and Deploy edrion-seed-showcase

There are 3 groups of build errors to fix before deploying the edge function.

### 1. Fix `edrion-seed-showcase/index.ts` — SupabaseClient type error

Change the `uploadImage` function parameter from `ReturnType<typeof createClient>` to `any` (with deno-lint-ignore), matching the pattern used in other edge functions.

**File**: `supabase/functions/edrion-seed-showcase/index.ts` line 122
- Change: `supabaseAdmin: ReturnType<typeof createClient>` → `supabaseAdmin: any`
- Add `// deno-lint-ignore no-explicit-any` above the parameter

### 2. Fix `src/services/analyze.ts` — RPC type error

Line 170 calls `supabase.rpc("is_email_blocked", ...)` but the generated types only know about `increment_analysis_credits`. The `is_email_blocked` function exists in the database but isn't in the generated types file.

**Fix**: Cast the rpc call with `as any` to bypass the type restriction, since the function does exist in the DB.

**File**: `src/services/analyze.ts` line 170

### 3. Fix `src/services/showcase-data/eduardofeldberg.ts` — missing `numero` property

Every `StorySlide` object is missing the required `numero` field. There are ~40 slides across 10 story sequences (days 1-10, 4 slides each).

**Fix**: Add `numero: N` to each slide object, numbering 1-4 within each day's slides array.

### 4. Deploy and invoke edrion-seed-showcase

- Add `edrion-seed-showcase` to `supabase/config.toml`
- Deploy the edge function
- Invoke it with service_role key (POST, no body)
- Note: Processing takes ~15 minutes (sequential Apify polling)


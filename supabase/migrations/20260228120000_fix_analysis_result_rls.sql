-- Fix: Add direct RLS policy on analysis_result using user_id column
-- The existing policy uses a subquery via analysis_request which can be fragile

-- Ensure user_id column exists (idempotent)
ALTER TABLE public.analysis_result ADD COLUMN IF NOT EXISTS user_id UUID;

-- Backfill user_id from analysis_request for any rows where it's null
UPDATE public.analysis_result ar
SET user_id = req.user_id
FROM public.analysis_request req
WHERE ar.request_id = req.id
  AND ar.user_id IS NULL;

-- Add direct RLS policy: users can read their own results by user_id
-- Drop first to be idempotent
DROP POLICY IF EXISTS "Users read own results direct" ON public.analysis_result;
CREATE POLICY "Users read own results direct" ON public.analysis_result
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Keep the old policy as fallback (for rows that might have null user_id)
-- DROP POLICY IF EXISTS "Users read own results" ON public.analysis_result;

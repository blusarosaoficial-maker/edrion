
-- Create hotmart_transactions table
CREATE TABLE public.hotmart_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  transaction_code TEXT NOT NULL DEFAULT 'unknown',
  buyer_email TEXT NOT NULL DEFAULT 'unknown',
  buyer_name TEXT,
  product_id INTEGER,
  product_name TEXT,
  offer_code TEXT,
  price_value NUMERIC,
  price_currency TEXT DEFAULT 'BRL',
  payment_type TEXT,
  user_id UUID,
  analysis_result_id UUID REFERENCES public.analysis_result(id),
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hotmart_transactions ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service manages transactions"
  ON public.hotmart_transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add unlocked_at to analysis_result if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'analysis_result' AND column_name = 'unlocked_at'
  ) THEN
    ALTER TABLE public.analysis_result ADD COLUMN unlocked_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add analysis_credits to users_profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users_profiles' AND column_name = 'analysis_credits'
  ) THEN
    ALTER TABLE public.users_profiles ADD COLUMN analysis_credits INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create increment_analysis_credits RPC function
CREATE OR REPLACE FUNCTION public.increment_analysis_credits(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE users_profiles
  SET analysis_credits = analysis_credits + 1
  WHERE id = p_user_id;
END;
$$;

-- Index for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_hotmart_tx_event_id ON public.hotmart_transactions(webhook_event_id);
CREATE INDEX IF NOT EXISTS idx_hotmart_tx_transaction_code ON public.hotmart_transactions(transaction_code);
CREATE INDEX IF NOT EXISTS idx_hotmart_tx_buyer_email ON public.hotmart_transactions(buyer_email);

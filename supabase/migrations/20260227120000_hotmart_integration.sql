-- =====================================================
-- Migration: Hotmart Integration + Credit System
-- =====================================================

-- 1. Tabela hotmart_transactions — audit trail de webhooks
CREATE TABLE public.hotmart_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  transaction_code TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_name TEXT,
  product_id INTEGER,
  product_name TEXT,
  offer_code TEXT,
  price_value NUMERIC(10,2),
  price_currency TEXT DEFAULT 'BRL',
  payment_type TEXT,
  user_id UUID REFERENCES auth.users(id),
  analysis_result_id UUID REFERENCES public.analysis_result(id),
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hotmart_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service manages transactions"
  ON public.hotmart_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users read own transactions"
  ON public.hotmart_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_hotmart_tx_buyer_email ON public.hotmart_transactions(buyer_email);
CREATE INDEX idx_hotmart_tx_user_id ON public.hotmart_transactions(user_id);
CREATE INDEX idx_hotmart_tx_transaction_code ON public.hotmart_transactions(transaction_code);

-- 2. Coluna de creditos em users_profiles
ALTER TABLE public.users_profiles
  ADD COLUMN IF NOT EXISTS analysis_credits INTEGER NOT NULL DEFAULT 0;

-- 3. Coluna unlocked_at em analysis_result
ALTER TABLE public.analysis_result
  ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ;

-- 4. Funcao RPC para incrementar creditos (atomica)
CREATE OR REPLACE FUNCTION public.increment_analysis_credits(p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.users_profiles
  SET analysis_credits = analysis_credits + 1
  WHERE id = p_user_id;
END;
$$;

-- 5. Habilitar Realtime na tabela analysis_result
ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_result;

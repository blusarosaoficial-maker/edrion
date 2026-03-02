# Edrion — Regras de Negocio

## 1. Planos

| Plano   | Descricao                                    | Preco    |
|---------|----------------------------------------------|----------|
| Free    | 1 analise gratuita com conteudo parcial      | R$0      |
| Premium | Analise completa (desbloqueada por compra)   | R$25,97  |

**Preco de referencia**: ~~R$51,94~~ → R$25,97 (50% OFF). Pagamento unico, sem assinatura.

## 2. Fluxo Free → Pago

1. Usuario se cadastra → `users_profiles.plan = "free"`, `free_analysis_used = false`, `analysis_credits = 0`
2. Usuario faz 1a analise → resultado salvo com `plan: "free"` no `result_json`
3. `free_analysis_used` marcado como `true`
4. Tentativa de 2a analise → bloqueado com `FREE_LIMIT_REACHED` (tela UpgradePrompt)
5. Dentro da analise, conteudo PRO (posts detalhados, semana de conteudo) bloqueado com UpgradeModal
6. Usuario clica "DESBLOQUEAR AGORA" → redireciona para checkout Hotmart
7. Hotmart envia webhook `PURCHASE_APPROVED` → sistema desbloqueia analise

## 3. O que e Free vs Premium

| Secao                  | Free                                         | Premium                |
|------------------------|----------------------------------------------|------------------------|
| Bio sugestao           | 100% completa                                | 100% completa          |
| Top Post (foto/stats)  | Visivel                                      | Visivel                |
| Top Post (analise IA)  | Bloqueado → UpgradeModal                     | PostAnalysisModal      |
| Worst Post (foto/stats)| Visivel                                      | Visivel                |
| Worst Post (analise IA)| Bloqueado → UpgradeModal                     | PostAnalysisModal      |
| Weekly Content header  | Visivel (titulo + estrategia)                | Visivel                |
| Weekly Content dias    | Dia/semana visiveis, titulo mascarado        | Tudo visivel + expand  |
| WhatsApp suporte       | Nao                                          | Sim                    |

## 4. Sistema de Creditos

- Cada compra aprovada na Hotmart = 1 credito
- Se usuario tem analise bloqueada (plan:"free") → credito consumido automaticamente, analise desbloqueada
- Se nao tem analise bloqueada → credito acumula em `users_profiles.analysis_credits`
- Quando faz nova analise com credito disponivel → analise ja nasce como "premium" (credito auto-consumido)
- Apos desbloqueio, `free_analysis_used` volta para `false` → pode fazer nova analise gratuita

## 5. Retencao

- Todas as analises (free e premium) ficam disponiveis no historico por **90 dias** a partir da data de criacao
- Apos 90 dias, analises nao aparecem mais no historico (filtro no frontend)

## 6. Webhook Hotmart

### Eventos tratados

| Evento              | Acao                                                            |
|---------------------|-----------------------------------------------------------------|
| PURCHASE_APPROVED   | Desbloqueia analise OU adiciona credito + reseta free_analysis  |
| PURCHASE_REFUNDED   | Re-bloqueia analise (plan volta para "free")                    |
| Outros              | Armazenados para audit trail, sem acao                          |

### Seguranca

- Validacao de `hottok` (token secreto configurado como env var `HOTMART_HOTTOK`)
- Idempotencia via `webhook_event_id` (UNIQUE constraint — duplicatas retornam 200 sem reprocessar)

### Mapeamento usuario

- Hotmart envia `buyer.email` no webhook
- Sistema busca usuario em `auth.users` pelo email
- Se email nao encontrado → transacao registrada com erro, nao processa

## 7. Historico

- Card mostra badge "Completa" (verde) para analises premium
- Card mostra badge "PRO" (amber) para analises bloqueadas
- Realtime: quando analise e desbloqueada via webhook, historico atualiza automaticamente (Supabase Realtime)
- Busca por @handle disponivel

## 8. Checkout

- URL da Hotmart configurada como constante (`HOTMART_CHECKOUT_URL`)
- Email do usuario pre-preenchido na URL do checkout (`?email=`)
- Garantia de 7 dias
- Linguagem de "desbloquear", nunca "comprar"

## 9. Suporte

- Usuarios premium veem botao "Falar com suporte" (WhatsApp)
- Numero configurado como placeholder (`NUMERO_PLACEHOLDER`)

## 10. Banco de Dados

### Tabelas

- `users_profiles` — Perfil do usuario (plan, free_analysis_used, analysis_credits)
- `analysis_request` — Requisicao de analise (handle, nicho, objetivo)
- `analysis_result` — Resultado completo (result_json com plan, unlocked_at)
- `hotmart_transactions` — Audit trail de webhooks Hotmart

### Campos-chave

- `result_json.plan`: "free" | "premium" — controla gate no frontend
- `unlocked_at`: TIMESTAMPTZ — quando a analise foi desbloqueada (NULL se nunca)
- `analysis_credits`: INTEGER — creditos disponiveis do usuario
- `free_analysis_used`: BOOLEAN — se ja usou a analise gratuita

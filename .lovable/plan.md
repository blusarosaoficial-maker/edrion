

# LoadingOverlay: Tela Unica com Dados Reais Progressivos

## Problema Atual

O `LoadingOverlay` atual tem **3 problemas principais**:

1. **Troca de telas**: Cada fase (A, B, C, D, done) renderiza conteudo completamente diferente com `{phase === "X" && ...}`, causando "flashes" e sensacao de telas separadas
2. **Foto do perfil nao aparece durante a coleta**: Na fase B, a foto so aparece se `profileSnapshot` ja estiver disponivel, mas o dado real so chega quando a API responde (~15-20s depois)
3. **Transicao muito abrupta**: O overlay some e aparece o modal de e-mail sem continuidade visual

## Solucao: Layout Unico Progressivo

Inspirado no concorrente (AnalysisScanner), criar uma **tela unica** que se **enriquece progressivamente** conforme os dados chegam. A estrutura sera sempre a mesma -- o que muda e o conteudo interno que vai "aparecendo" com animacoes.

### Layout fixo (sempre visivel):

```text
+------------------------------------------+
|                                          |
|        [Avatar / Instagram Icon]         |  <-- Inicia com icone IG,
|        Nome / @handle                    |      troca para foto real
|                                          |
|   +------+   +----------+   +--------+  |
|   | Posts |   | Seguidores|  | Seguindo| |  <-- CountUp animado
|   +------+   +----------+   +--------+  |
|                                          |
|   Bio do perfil...                       |  <-- Aparece com fade-in
|                                          |
|   [Mensagem de status atual]             |  <-- Troca com animacao
|   [====== Barra de progresso ======]     |
|   XX%                                    |
+------------------------------------------+
```

### Fases (mesma tela, conteudo progressivo):

| Fase | Tempo | O que muda visualmente |
|------|-------|----------------------|
| **Localizando** | 0-15% (~5s) | Icone Instagram com scanner glow + @handle + timer circular. Stats e bio ocultos |
| **Coletando** | 15-40% (~7s) | Quando `profileSnapshot` chega: icone IG faz fade-out, avatar real faz fade-in. Nome real aparece. Stats comecam countup de 0 ate valor real |
| **Analisando** | 40-75% (~8s) | Bio aparece com fade-in. Mensagem muda para "Analisando dados..." |
| **Gerando diagnostico** | 75-94% (~5s) | Spinner + "IA processando dados..." |
| **Pronto** | 100% | Checkmark animado sobre o avatar. Apos 1.5s, transita para email modal ou resultado |

### Diferencial vs concorrente:
- **UMA tela so** que se preenche (nao 3 telas separadas)
- Scanner com glow nas cores da marca (roxo/rosa, nao laranja)
- CountUp mais lento e dramatico (~3s por numero)
- Numeros grandes aparecem "alimentando" em batches (efeito de coleta)

## Detalhes Tecnicos

### Arquivo: `src/components/LoadingOverlay.tsx`

Reescrever para ter layout unico:
- Container fixo com todas as secoes sempre presentes (controladas por opacity/visibility, nao por renderizacao condicional)
- Secao avatar: inicia com icone Instagram dentro de quadrado com scanner lines animadas (como concorrente), transiciona para `<img>` do perfil real quando `profileSnapshot` chega
- Secao stats: 3 cards com CountUp. Inicialmente com valor 0 e opacidade reduzida. Quando snapshot chega, countup inicia e opacidade sobe
- Secao bio: inicia oculta (h-0 + opacity-0), expande com animacao quando snapshot chega e fase >= C
- Secao status: mensagem + barra de progresso sempre visiveis, conteudo da mensagem muda por fase
- Timer circular: visivel apenas durante fase A, faz fade-out quando fase muda

### Arquivo: `src/pages/Index.tsx`

Sem mudancas significativas -- a logica de `profileSnapshot` ja esta correta. O overlay recebe `profileSnapshot` e reage quando o valor muda de `null` para dados reais.

### Arquivo: `src/index.css`

Adicionar animacoes scanner (inspiradas no concorrente mas com cores EDRION):
- `@keyframes scanner-top/bottom/left/right` para as linhas de scanner no icone Instagram
- Ajustar `animate-pulse-glow` para usar cores da marca

### Arquivo: `tailwind.config.ts`

Adicionar keyframes e animations:
- `scanner-top`, `scanner-bottom`, `scanner-left`, `scanner-right`
- `pulse-glow` (ja existe no CSS, mover para config para consistencia)

### Arquivo: `src/hooks/useCountUp.ts`

Aumentar duracao padrao de 2000ms para 3000ms para efeito mais dramatico. Sem outras mudancas.

### Sem mudancas no backend

O backend ja retorna `pending_result.profile` com todos os dados reais (avatar_url, followers, following, posts_count, bio_text, is_verified). Nenhuma alteracao necessaria.


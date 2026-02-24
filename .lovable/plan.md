
# Adicionar Deteccao de Tom de Voz na Analise de Bio

## Problema

Atualmente, a IA sugere uma nova bio sem considerar como o usuario se comunica. Se o perfil tem uma bio descontraida e informal, a IA pode sugerir algo formal demais, e o usuario rejeita. A nova bio precisa manter o "jeito de falar" do dono do perfil.

## Solucao

Adicionar um passo de **deteccao de tom de voz** no prompt da OpenAI. A IA vai analisar a bio atual (e os previews de caption dos posts, que ja temos) para identificar o estilo de comunicacao, e usar esse tom na nova bio sugerida.

## Dados Disponiveis (sem mudanca no scraping)

Ja temos tudo que precisamos para inferir o tom:
- `profile.bio_text` -- a bio atual do usuario
- `posts[].caption_preview` -- os primeiros 120 caracteres de ate 9 posts recentes

Esses textos sao suficientes para a IA identificar se o usuario e formal, informal, divertido, tecnico, etc.

## Arquivo Alterado

| Arquivo | Acao | Risco |
|---------|------|-------|
| `supabase/functions/edrion-analyze/index.ts` | Atualizar prompt + schema + passar captions | Baixo -- fallback continua funcionando |

Nenhum outro arquivo muda. Os tipos e o frontend ja suportam os campos existentes.

## Mudancas no Detalhe

### 1. Assinatura de `analyzeBioWithAI`

Adicionar parametro `captions: string[]` para receber os previews de caption dos posts.

```text
analyzeBioWithAI(profile, nicho, objetivo, captions)
```

### 2. System Prompt -- Adicionar bloco de tom de voz

Inserir no system prompt, apos os 4 criterios e antes das regras criticas:

```text
ANALISE DE TOM DE VOZ:
Antes de sugerir a nova bio, analise a bio atual e as legendas recentes do perfil
para identificar o tom de comunicacao do usuario (ex: formal, informal, descontraido,
tecnico, inspiracional, humoristico, direto, acolhedor).

A nova bio DEVE manter o mesmo tom de voz identificado. Use palavras, expressoes
e estilo compativel com a forma como o usuario ja se comunica. A estrutura e
estrategia mudam, mas a "voz" permanece a mesma.

Se a bio atual estiver vazia ou muito curta para inferir o tom, use as legendas
dos posts recentes como referencia. Se ambos estiverem vazios, use um tom
profissional e acessivel como padrao.
```

### 3. User Message -- Adicionar legendas como contexto

Apos os dados atuais (handle, bio, seguidores, etc.), adicionar:

```text
legendas_recentes:
- "preview do caption 1"
- "preview do caption 2"
...
```

Enviar ate 5 captions (os que ja temos via `normalizePosts`), truncados em 120 chars cada.

### 4. Tool Calling Schema -- Novo campo `detected_tone`

Adicionar ao schema da tool:

```text
detected_tone: {
  type: "string",
  description: "Tom de voz identificado na comunicacao do perfil
    (ex: informal e descontraido, formal e tecnico, acolhedor e inspiracional)"
}
```

Esse campo sera retornado pela IA mas nao precisa de mudanca no frontend agora -- ele sera usado internamente para garantir coerencia e pode ser exibido futuramente.

### 5. Chamada em `buildFreeResult`

Passar os captions dos posts para a funcao:

```text
const captions = posts.map(p => p.caption_preview).filter(Boolean).slice(0, 5);
const aiResult = await analyzeBioWithAI(profile, nicho, objetivo, captions);
```

## Fluxo Completo

```text
1. Apify scrape -> perfil + 9 posts com captions
2. normalizePosts -> caption_preview (120 chars cada)
3. buildFreeResult passa captions para analyzeBioWithAI
4. analyzeBioWithAI envia ao OpenAI:
   - System prompt com instrucao de detectar tom
   - User message com bio + legendas recentes
   - Schema com campo detected_tone
5. OpenAI analisa tom -> escreve nova bio no mesmo estilo
6. Resultado retorna com detected_tone (campo extra, opcional)
7. Frontend exibe normalmente (sem mudanca visual por agora)
```

## Impacto

- Zero mudanca no frontend, tipos, scraping, cache, login, ou qualquer outro fluxo
- O campo `detected_tone` e informativo -- pode ser exibido no futuro se desejado
- Fallback para templates estaticos continua funcionando (templates nao usam tom, mas sao emergenciais)
- A unica mudanca e no prompt e schema enviados a OpenAI dentro da edge function

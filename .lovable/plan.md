

# Correcoes no AuthModal e Fluxo de Retorno

## Problema 1: Modal nao fecha

O `AuthModal` atual impede qualquer forma de fechar:
- `onOpenChange={() => {}}` ignora o X
- `onPointerDownOutside` bloqueado
- `onEscapeKeyDown` bloqueado

**Correcao**: Permitir fechar o modal via botao X, ESC e click fora. Ao fechar, cancelar o fluxo pendente.

## Problema 2: Ao fechar, limpar estado

Quando o usuario fecha o modal sem completar o login, o sistema deve voltar ao estado `form` e limpar `pendingInputs`.

## Mudancas

### `src/components/AuthModal.tsx`

- Adicionar prop `onClose` para quando o usuario fechar o modal
- Passar `onClose` para `onOpenChange` do Dialog
- Remover `preventDefault` de `onPointerDownOutside` e `onEscapeKeyDown`

```
interface Props {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;    // NOVO
}
```

- `onOpenChange` passa a chamar `onClose` quando `open` muda para `false`

### `src/pages/Index.tsx`

- Adicionar handler `handleAuthClose` que:
  - Fecha o modal (`setShowAuthModal(false)`)
  - Limpa `pendingInputs`
  - Mantem estado `form`
- Passar `onClose={handleAuthClose}` para o `AuthModal`

## Fluxo Completo Explicado

### Primeira visita (sem sessao)
1. Usuario coloca @handle e clica "Analisar"
2. Backend retorna `AUTH_REQUIRED` (sem gastar Apify)
3. Frontend abre AuthModal
4. Usuario digita email e clica "Enviar"
5. Tela muda para "Verifique seu e-mail"
6. Usuario pode FECHAR o modal (volta ao form) ou esperar
7. Usuario clica no link magico no email
8. Navegador detecta sessao via `onAuthStateChange`
9. Modal fecha automaticamente e analise re-submete com JWT

### Proxima visita (sessao ativa)
1. Usuario ja esta logado (sessao persistida no localStorage)
2. Coloca @handle e clica "Analisar"
3. Backend recebe JWT automaticamente
4. Se handle+user_id ja existe: retorna resultado cacheado
5. Se nao existe e free_analysis_used=false: roda Apify normalmente
6. Se free_analysis_used=true: retorna FREE_LIMIT_REACHED

### Se sessao expirou
1. Mesmo fluxo da primeira visita -- AuthModal aparece novamente
2. Magic Link renova a sessao

## Arquivos impactados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/AuthModal.tsx` | Adicionar prop `onClose`, permitir fechar modal |
| `src/pages/Index.tsx` | Adicionar `handleAuthClose`, passar para AuthModal |


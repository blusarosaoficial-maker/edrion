

## Deploy Edge Function edrion-analyze (commit 79a3bcd)

### Status: Code Synchronized

All changes from commit `79a3bcd` are already present in the codebase. No file modifications needed.

### Changes Confirmed in `supabase/functions/edrion-analyze/index.ts`:

1. **`ApifyProfile` interface** -- added `externalUrl` and `bioLinks` fields (lines 107-108)
2. **`normalizeProfile()`** -- now extracts `bio_link` from profile (line 195)
3. **System prompt (mission)** -- changed from "gerar nova bio" to "ADAPTAR e OTIMIZAR a bio existente" (line 509)
4. **Phase 2 instructions** -- added guidance to preserve identity, tone, and facts (lines 593-596)
5. **REGRA DO LINK DA BIO** -- new rule block prohibiting invention of link content (lines 678-686)
6. **Rule 10 (expanded)** -- now explicitly prohibits inventing products, courses, methods, and offers (line 778)
7. **Rule 11 (new)** -- requires bio to be a strategic evolution, not invented from scratch (line 780)
8. **User message** -- now includes "Link da bio" context for the AI (line 790)
9. **`validateBioTextClaims()`** -- new function that filters hallucinated offer terms like masterclass, curso, ebook, mentoria, etc. (lines 155-181)

### Action Required

Redeploy the `edrion-analyze` edge function to Supabase to activate all anti-hallucination improvements.

### No Frontend Changes

No frontend files were modified in this commit. Only the edge function needs redeployment.


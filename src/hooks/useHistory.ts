import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AnalysisResult } from "@/types/analysis";

export interface HistoryEntry {
  id: string;
  handle: string;
  avatar_url: string;
  full_name: string;
  followers: number;
  nicho: string;
  objetivo: string;
  created_at: string;
  result: AnalysisResult;
}

export function useHistory(searchQuery: string = "") {
  const { user } = useAuth();

  return useQuery<HistoryEntry[]>({
    queryKey: ["history", user?.id, searchQuery],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("analysis_result")
        .select(
          "id, handle, result_json, created_at, analysis_request!inner(nicho, objetivo)"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (searchQuery.trim()) {
        query = query.ilike("handle", `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || [])
        .map((row) => {
          try {
            const result = row.result_json as unknown as AnalysisResult;
            const req = row.analysis_request as unknown as {
              nicho: string;
              objetivo: string;
            } | null;
            return {
              id: row.id,
              handle: row.handle,
              avatar_url: result?.profile?.avatar_url || "",
              full_name: result?.profile?.full_name || row.handle,
              followers: result?.profile?.followers || 0,
              nicho: req?.nicho || "",
              objetivo: req?.objetivo || "",
              created_at: row.created_at,
              result,
            };
          } catch {
            return null;
          }
        })
        .filter((entry): entry is HistoryEntry => entry !== null);
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

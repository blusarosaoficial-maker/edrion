import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  // Realtime subscription — auto-refresh when analysis_result is updated (e.g., unlock)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("analysis-unlock")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "analysis_result",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["history", user.id] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery<HistoryEntry[]>({
    queryKey: ["history", user?.id, searchQuery],
    queryFn: async () => {
      if (!user) return [];

      // 90-day retention filter
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      let query = supabase
        .from("analysis_result")
        .select(
          "id, handle, result_json, created_at, analysis_request!inner(nicho, objetivo)"
        )
        .eq("user_id", user.id)
        .gte("created_at", ninetyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (searchQuery.trim()) {
        const q = searchQuery.trim().replace(/^@/, "").toLowerCase();
        query = query.ilike("handle", `%${q}%`);
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

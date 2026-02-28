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

  // Realtime subscription — auto-refresh on INSERT or UPDATE (new analysis or unlock)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("analysis-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "analysis_result",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["history"] });
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

      // Query results — no join, simple flat query
      // RLS policy "Users read own results direct" ensures only user's rows return
      let query = supabase
        .from("analysis_result")
        .select("id, handle, result_json, created_at, request_id")
        .eq("user_id", user.id)
        .gte("created_at", ninetyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (searchQuery.trim()) {
        const q = searchQuery.trim().replace(/^@/, "").toLowerCase();
        query = query.ilike("handle", `%${q}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error("[useHistory] query error:", error.message, error.details, error.hint);
        throw error;
      }

      if (!data || data.length === 0) return [];

      // Step 2: Fetch nicho/objetivo from analysis_request in batch
      const requestIds = [...new Set(data.map((r) => r.request_id).filter(Boolean))];
      let requestMap: Record<string, { nicho: string; objetivo: string }> = {};

      if (requestIds.length > 0) {
        const { data: requests } = await supabase
          .from("analysis_request")
          .select("id, nicho, objetivo")
          .in("id", requestIds);

        if (requests) {
          requestMap = Object.fromEntries(
            requests.map((r) => [r.id, { nicho: r.nicho, objetivo: r.objetivo }])
          );
        }
      }

      return data
        .map((row) => {
          try {
            const result = row.result_json as unknown as AnalysisResult;
            const req = row.request_id ? requestMap[row.request_id] : null;
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
    staleTime: 5 * 1000,
  });
}

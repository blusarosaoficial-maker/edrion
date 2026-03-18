import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult } from "@/types/analysis";

/**
 * Listens for Supabase Realtime updates on analysis_result table.
 * When the backend finishes deferred enrichment (weekly/stories/hashtags),
 * it updates the DB row — this hook picks up the change and calls onUpdate.
 *
 * Also polls the DB as a fallback in case Realtime misses the event.
 */
export function useProgressiveResult(
  userId: string | undefined,
  enabled: boolean,
  onUpdate: (result: AnalysisResult) => void,
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (!userId || !enabled) {
      resolvedRef.current = false;
      return;
    }

    resolvedRef.current = false;

    const handleResult = (resultJson: AnalysisResult) => {
      if (resolvedRef.current) return;
      if (!resultJson._deferred) {
        resolvedRef.current = true;
        onUpdateRef.current(resultJson);
      }
    };

    // Realtime subscription
    const channel = supabase
      .channel("progressive-result")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "analysis_result",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as { result_json?: unknown };
          const resultJson = updated.result_json as AnalysisResult | undefined;
          if (resultJson) handleResult(resultJson);
        },
      )
      .subscribe();

    // Fallback polling: check every 10s in case Realtime misses the event
    const pollInterval = setInterval(async () => {
      if (resolvedRef.current) return;
      try {
        const { data } = await supabase
          .from("analysis_result")
          .select("result_json")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (data?.result_json) {
          handleResult(data.result_json as unknown as AnalysisResult);
        }
      } catch {
        // Ignore polling errors
      }
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [userId, enabled]);
}

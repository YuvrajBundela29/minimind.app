import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget usage logging for authenticated users.
 * Also increments user_statistics.total_questions so frames/achievements stay in sync.
 * Never throws — failures are silently logged to console.
 */
export function logUsage(params: {
  queryText: string;
  mode: string;
  language: string;
  responseLength: number;
}): void {
  // Don't await — fire and forget
  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Skip for guests

      // Insert usage log
      await supabase.from("usage_logs").insert({
        user_id: user.id,
        query_text: params.queryText,
        mode: params.mode,
        language: params.language,
        response_length: params.responseLength,
      });

      // Get actual count from usage_logs and sync to user_statistics
      const { count } = await supabase
        .from("usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (count !== null) {
        const today = new Date().toISOString().split("T")[0];
        await supabase
          .from("user_statistics")
          .update({
            total_questions: count,
            last_activity_date: today,
          })
          .eq("user_id", user.id);
      }
    } catch (err) {
      console.error("Usage logging failed (non-blocking):", err);
    }
  })();
}

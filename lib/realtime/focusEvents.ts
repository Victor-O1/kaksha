import { getSupabaseClient } from "@/lib/supabase";
import { FocusEvent } from "@/lib/types";

type OnEvent = (event: FocusEvent) => void;

export function subscribeToFocusEvents(onEvent: OnEvent) {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  const channel = supabase
    .channel("focus-events")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "focus_events",
      },
      (payload) => {
        onEvent(payload.new as FocusEvent);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

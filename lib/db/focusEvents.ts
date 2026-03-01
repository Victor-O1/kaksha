// import { getSupabaseClient } from "@/lib/supabase";
// import { FocusEvent, FocusEventType } from "@/lib/types";

// const supabase = getSupabaseClient();

// /* ---------------- FETCH ---------------- */

// export async function fetchFocusEvents(userId: string | null) {
//   let q = supabase
//     .from("focus_events")
//     .select("*")
//     .order("created_at", { ascending: true });

//   if (userId) q = q.eq("user_id", userId);

//   const { data, error } = await q;
//   if (error) throw error;

//   return data as FocusEvent[];
// }

// /* ---------------- INSERT ---------------- */

// export async function insertFocusEvent(
//   subjectId: string,
//   type: FocusEventType,
// ) {
//   const payload = {
//     subject_id: subjectId,
//     user_id: null, // until auth
//     type,
//     client_time: Date.now(),
//   };

//   const { data, error } = await supabase
//     .from("focus_events")
//     .insert(payload)
//     .select()
//     .single();

//   if (error) throw error;
//   return data as FocusEvent;
// }

// /* ---------------- REALTIME ---------------- */

// export function subscribeToFocusEvents(onChange: () => void) {
//   const channel = supabase
//     .channel("focus-events")
//     .on(
//       "postgres_changes",
//       {
//         event: "*",
//         schema: "public",
//         table: "focus_events",
//       },
//       () => {
//         onChange();
//       },
//     )
//     .subscribe();

//   return () => {
//     supabase.removeChannel(channel);
//   };
// }

import { getSupabaseClient } from "@/lib/supabase";
import { FocusEvent, FocusEventType } from "@/lib/types";

const supabase = getSupabaseClient();

/* ---------------- FETCH ---------------- */
export async function fetchFocusEvents(userId: string | null) {
  let q = supabase
    .from("focus_events")
    .select("*")
    .order("created_at", { ascending: true });

  // ✅ CRITICAL: Always filter by user to prevent cross-user data access
  if (userId) {
    q = q.eq("user_id", userId);
  } else {
    // If no userId provided, return empty array (security measure)
    console.warn("⚠️ fetchFocusEvents called without userId");
    return [];
  }

  const { data, error } = await q;
  if (error) throw error;
  return data as FocusEvent[];
}

/* ---------------- INSERT ---------------- */
export async function insertFocusEvent(
  userId: string,
  subjectId: string,
  type: FocusEventType,
) {
  const payload = {
    subject_id: subjectId,
    user_id: userId, // ✅ FIXED: Use actual user ID
    type,
    client_time: Date.now(),
  };

  const { data, error } = await supabase
    .from("focus_events")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as FocusEvent; // Fixed: return single FocusEvent, not array
}

/* ---------------- UPDATE (NEW) ---------------- */
export async function updateFocusEvent(
  eventId: string,
  updates: Partial<FocusEvent>,
) {
  const { data, error } = await supabase
    .from("focus_events")
    .update(updates)
    .eq("id", eventId)
    .select()
    .single();

  if (error) throw error;
  return data as FocusEvent;
}

/* ---------------- DELETE (NEW) ---------------- */
export async function deleteFocusEvent(eventId: string) {
  const { error } = await supabase
    .from("focus_events")
    .delete()
    .eq("id", eventId);

  if (error) throw error;
}

/* ---------------- REALTIME (USER-SPECIFIC) ---------------- */
export function subscribeToFocusEvents(userId: string, onChange: () => void) {
  const channel = supabase
    .channel(`focus-events-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "focus_events",
        filter: `user_id=eq.${userId}`, // ✅ CRITICAL: Only listen to this user's events
      },
      () => {
        onChange();
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

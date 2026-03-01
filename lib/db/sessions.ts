import { getSupabaseClient } from "@/lib/supabase";

import { Session, SessionInsert } from "@/lib/types";
const supabase = getSupabaseClient();

export async function insertSession(session: SessionInsert) {
  const { data, error } = await supabase
    .from("sessions")
    .insert(session)
    .select()
    .single();

  if (error) {
    console.error("Failed to insert session:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(error.message);
  }

  return data; // ✅ this IS a full Session with id
}

export async function fetchTodaySessions() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .gte("start_time", startOfDay.toISOString());

  if (error) {
    console.error("Failed to fetch today session:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(error.message);
  }

  return data as Session[];
}

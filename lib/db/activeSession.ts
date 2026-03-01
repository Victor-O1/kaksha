import { getSupabaseClient } from "@/lib/supabase";

export async function startActiveSession(userId: string, subjectId: string) {
  const supabase = getSupabaseClient();

  // Pause existing session
  await supabase
    .from("active_sessions")
    .update({ status: "paused" })
    .eq("user_id", userId)
    .eq("status", "running");

  // Start new session
  const { data, error } = await supabase
    .from("active_sessions")
    .insert({
      user_id: userId,
      subject_id: subjectId,
      status: "running",
      start_time: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchActiveSession(userId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("active_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "running")
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

export async function fetchAndDeleteActiveSession(userId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: session, error } = await supabase
    .from("active_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "running")
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  if (!session) return null;

  await supabase.from("active_sessions").delete().eq("id", session.id);

  return session;
}

// const LOCAL_USER_ID_KEY = "local_user_id";

// export function getLocalUserId() {
//   let id = localStorage.getItem(LOCAL_USER_ID_KEY);
//   if (!id) {
//     id = crypto.randomUUID();
//     localStorage.setItem(LOCAL_USER_ID_KEY, id);
//   }
//   return id;
// }

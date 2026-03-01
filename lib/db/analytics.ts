import { getSupabaseClient } from "@/lib/supabase";

export async function fetchTotalStudyTime(range: "day" | "week" | "month") {
  const supabase = getSupabaseClient();
  if (!supabase) return 0;

  let interval = "1 day";
  if (range === "week") interval = "7 days";
  if (range === "month") interval = "30 days";

  const { data, error } = await supabase.rpc("total_study_time", {
    interval_text: interval,
  });

  if (error) throw error;
  return data ?? 0;
}

export async function fetchSubjectWiseTime() {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("sessions").select(`
      subject_id,
      subjects ( name, color ),
      start_time,
      end_time
    `);

  if (error) throw error;

  const map: Record<string, any> = {};

  data.forEach((s: any) => {
    if (!s.subject_id || !s.end_time) return;

    const seconds =
      (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) /
      1000;

    if (!map[s.subject_id]) {
      map[s.subject_id] = {
        name: s.subjects.name,
        color: s.subjects.color,
        seconds: 0,
      };
    }

    map[s.subject_id].seconds += seconds;
  });

  return Object.values(map);
}

export async function fetchDailyTrend() {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("daily_study_trend");

  if (error) throw error;
  return data;
}

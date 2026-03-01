import { getSupabaseClient } from "@/lib/supabase";

const supabase = getSupabaseClient();

export type TaskStatus = "not_started" | "in_progress" | "complete";

export interface DailyTask {
  id: string;
  user_id: string;
  task_date: string;
  task_text: string;
  status: TaskStatus;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/* ---------------- FETCH TASKS FOR DATE ---------------- */
export async function fetchDailyTasks(userId: string, date: Date = new Date()) {
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD format

  const { data, error } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("task_date", dateStr)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return data as DailyTask[];
}

/* ---------------- INSERT NEW TASK ---------------- */
export async function insertDailyTask(
  userId: string,
  taskText: string,
  date: Date = new Date(),
) {
  const dateStr = date.toISOString().split("T")[0];

  // Get the max order_index for this user and date
  const { data: existingTasks } = await supabase
    .from("daily_tasks")
    .select("order_index")
    .eq("user_id", userId)
    .eq("task_date", dateStr)
    .order("order_index", { ascending: false })
    .limit(1);

  const nextOrderIndex = existingTasks?.[0]?.order_index + 1 || 0;

  const payload = {
    user_id: userId,
    task_text: taskText,
    task_date: dateStr,
    order_index: nextOrderIndex,
    status: "not_started" as TaskStatus,
  };

  const { data, error } = await supabase
    .from("daily_tasks")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as DailyTask;
}

/* ---------------- UPDATE TASK ---------------- */
export async function updateDailyTask(
  taskId: string,
  updates: Partial<Pick<DailyTask, "task_text" | "status" | "order_index">>,
) {
  const { data, error } = await supabase
    .from("daily_tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw error;
  return data as DailyTask;
}

/* ---------------- DELETE TASK ---------------- */
export async function deleteDailyTask(taskId: string) {
  const { error } = await supabase
    .from("daily_tasks")
    .delete()
    .eq("id", taskId);

  if (error) throw error;
}

/* ---------------- REORDER TASKS ---------------- */
export async function reorderDailyTasks(
  userId: string,
  taskIds: string[],
  date: Date = new Date(),
) {
  const dateStr = date.toISOString().split("T")[0];

  // Update each task with its new order_index
  const updates = taskIds.map((id, index) =>
    supabase
      .from("daily_tasks")
      .update({ order_index: index })
      .eq("id", id)
      .eq("user_id", userId)
      .eq("task_date", dateStr),
  );

  await Promise.all(updates);
}

/* ---------------- REALTIME SUBSCRIPTION ---------------- */
export function subscribeToDailyTasks(
  userId: string,
  date: Date = new Date(),
  onChange: () => void,
) {
  const dateStr = date.toISOString().split("T")[0];

  const channel = supabase
    .channel(`daily-tasks-${userId}-${dateStr}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "daily_tasks",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        // Only trigger if the change is for the current date
        if (payload.new && (payload.new as any).task_date === dateStr) {
          onChange();
        } else if (payload.old && (payload.old as any).task_date === dateStr) {
          onChange();
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

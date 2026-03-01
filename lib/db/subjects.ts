// import { getSupabaseClient } from "@/lib/supabase";

// import { Subject } from "@/lib/types";
// const supabase = getSupabaseClient();

// export async function fetchSubjectsFromDB() {
//   const { data, error } = await supabase
//     .from("subjects")
//     .select("*")
//     .order("created_at", { ascending: true });

//   if (error) {
//     console.error("Failed to fetch subjects:", error);
//     throw error;
//   }

//   return data as Subject[];
// }

// export async function insertSubject(subject: Subject) {
//   const { error } = await supabase.from("subjects").insert(subject);

//   if (error) {
//     console.error("Failed to insert subject:", error);
//     throw error;
//   }
// }

// export async function deleteSubjectById(subjectId: string) {
//   const { error } = await supabase
//     .from("subjects")
//     .delete()
//     .eq("id", subjectId);

//   if (error) {
//     console.error("Failed to delete subject:", error);
//     throw error;
//   }
// }

// export async function updateSubjectInDB(
//   subjectId: string,
//   updates: {
//     name: string;
//     color: string;
//   }
// ) {
//   const { error } = await supabase
//     .from("subjects")
//     .update({
//       name: updates.name,
//       color: updates.color,
//     })
//     .eq("id", subjectId);

//   if (error) {
//     console.error("Failed to update subject:", error);
//     throw error;
//   }
// }

import { getSupabaseClient } from "@/lib/supabase";
import { Subject } from "@/lib/types";

const supabase = getSupabaseClient();

/* ================================
   FETCH SUBJECTS (USER-SCOPED)
================================ */
export async function fetchSubjectsFromDB(userId: string): Promise<Subject[]> {
  if (!userId) {
    throw new Error("fetchSubjectsFromDB called without userId");
  }

  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch subjects:", error);
    throw error;
  }

  return data as Subject[];
}

/* ================================
   INSERT SUBJECT (USER REQUIRED)
================================ */
export async function insertSubject(
  userId: string,
  subject: Omit<Subject, "user_id">,
) {
  if (!userId) {
    throw new Error("insertSubject called without userId");
  }

  const { error } = await supabase.from("subjects").insert({
    ...subject,
    user_id: userId,
  });

  if (error) {
    console.error("Failed to insert subject:", error);
    throw error;
  }
}

/* ================================
   DELETE SUBJECT (USER-SAFE)
================================ */
export async function deleteSubjectById(userId: string, subjectId: string) {
  if (!userId) {
    throw new Error("deleteSubjectById called without userId");
  }

  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", subjectId)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to delete subject:", error);
    throw error;
  }
}

/* ================================
   UPDATE SUBJECT (USER-SAFE)
================================ */
export async function updateSubjectInDB(
  userId: string,
  subjectId: string,
  updates: {
    name: string;
    color: string;
  },
) {
  if (!userId) {
    throw new Error("updateSubjectInDB called without userId");
  }

  const { error } = await supabase
    .from("subjects")
    .update({
      name: updates.name,
      color: updates.color,
    })
    .eq("id", subjectId)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to update subject:", error);
    throw error;
  }
}

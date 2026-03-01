// // lib/db/notes.ts - Updated version with header_image
// import { getSupabaseClient } from "@/lib/supabase";
// import { Note, Subject } from "@/lib/types";

// const supabase = getSupabaseClient();

// // ==================== SUBJECTS ====================

// export async function fetchSubjects(userId: string): Promise<Subject[]> {
//   const { data, error } = await supabase
//     .from("subjects")
//     .select("*")
//     .eq("user_id", userId)
//     .order("created_at", { ascending: true });

//   if (error) {
//     console.error("Error fetching subjects:", error);
//     return [];
//   }

//   return data || [];
// }

// export async function createSubject(
//   userId: string,
//   subject: Omit<Subject, "id" | "created_at">,
// ): Promise<Subject | null> {
//   const { data, error } = await supabase
//     .from("subjects")
//     .insert({
//       user_id: userId,
//       name: subject.name,
//       color: subject.color,
//       image: subject.image,
//     })
//     .select()
//     .single();

//   if (error) {
//     console.error("Error creating subject:", error);
//     return null;
//   }

//   return data;
// }

// export async function updateSubject(
//   userId: string,
//   subjectId: string,
//   updates: Partial<Pick<Subject, "name" | "color" | "image">>,
// ): Promise<Subject | null> {
//   const { data, error } = await supabase
//     .from("subjects")
//     .update(updates)
//     .eq("id", subjectId)
//     .eq("user_id", userId)
//     .select()
//     .single();

//   if (error) {
//     console.error("Error updating subject:", error);
//     return null;
//   }

//   return data;
// }

// export async function deleteSubject(
//   userId: string,
//   subjectId: string,
// ): Promise<boolean> {
//   await supabase
//     .from("notes")
//     .delete()
//     .eq("subject_id", subjectId)
//     .eq("user_id", userId);

//   const { error } = await supabase
//     .from("subjects")
//     .delete()
//     .eq("id", subjectId)
//     .eq("user_id", userId);

//   if (error) {
//     console.error("Error deleting subject:", error);
//     return false;
//   }

//   return true;
// }

// // ==================== NOTES ====================

// export async function fetchNotes(userId: string): Promise<Note[]> {
//   const { data, error } = await supabase
//     .from("notes")
//     .select("*")
//     .eq("user_id", userId)
//     .order("updated_at", { ascending: false });

//   if (error) {
//     console.error("Error fetching notes:", error);
//     return [];
//   }

//   return data || [];
// }

// export async function fetchNotesBySubject(
//   userId: string,
//   subjectId: string,
// ): Promise<Note[]> {
//   const { data, error } = await supabase
//     .from("notes")
//     .select("*")
//     .eq("user_id", userId)
//     .eq("subject_id", subjectId)
//     .order("updated_at", { ascending: false });

//   if (error) {
//     console.error("Error fetching notes by subject:", error);
//     return [];
//   }

//   return data || [];
// }

// export async function fetchNoteById(
//   userId: string,
//   noteId: string,
// ): Promise<Note | null> {
//   const { data, error } = await supabase
//     .from("notes")
//     .select("*")
//     .eq("id", noteId)
//     .eq("user_id", userId)
//     .single();

//   if (error) {
//     console.error("Error fetching note:", error);
//     return null;
//   }

//   return data;
// }

// export async function createNote(
//   userId: string,
//   note: {
//     subject_id: string;
//     title: string;
//     content?: any;
//     header_image?: string;
//   },
// ): Promise<Note | null> {
//   const { data, error } = await supabase
//     .from("notes")
//     .insert({
//       user_id: userId,
//       subject_id: note.subject_id,
//       title: note.title,
//       content: note.content || [
//         {
//           id: crypto.randomUUID(),
//           type: "paragraph",
//           props: {},
//           content: [],
//           children: [],
//         },
//       ],
//       header_image:
//         note.header_image ||
//         "https://images.unsplash.com/photo-1516534775068-ba3e7458af70?w=1200&h=400&fit=crop",
//     })
//     .select()
//     .single();

//   if (error) {
//     console.error("Error creating note:", JSON.stringify(error, null, 2));
//     console.error("Error message:", error.message);
//     console.error("Error code:", error.code);
//     return null;
//   }

//   return data;
// }

// export async function updateNote(
//   userId: string,
//   noteId: string,
//   updates: {
//     title?: string;
//     content?: any;
//     subject_id?: string;
//     header_image?: string;
//   },
// ): Promise<Note | null> {
//   const { data, error } = await supabase
//     .from("notes")
//     .update({
//       ...updates,
//       updated_at: new Date().toISOString(),
//     })
//     .eq("id", noteId)
//     .eq("user_id", userId)
//     .select()
//     .single();

//   if (error) {
//     console.error("Error updating note:", error);
//     return null;
//   }

//   return data;
// }

// export async function deleteNote(
//   userId: string,
//   noteId: string,
// ): Promise<boolean> {
//   const { error } = await supabase
//     .from("notes")
//     .delete()
//     .eq("id", noteId)
//     .eq("user_id", userId);

//   if (error) {
//     console.error("Error deleting note:", error);
//     return false;
//   }

//   return true;
// }

// // ==================== REALTIME SUBSCRIPTIONS ====================

// export function subscribeToNotes(
//   userId: string,
//   callback: (payload: any) => void,
// ) {
//   const channel = supabase
//     .channel("notes-changes")
//     .on(
//       "postgres_changes",
//       {
//         event: "*",
//         schema: "public",
//         table: "notes",
//         filter: `user_id=eq.${userId}`,
//       },
//       callback,
//     )
//     .subscribe();

//   return () => {
//     supabase.removeChannel(channel);
//   };
// }

// export function subscribeToSubjects(
//   userId: string,
//   callback: (payload: any) => void,
// ) {
//   const channel = supabase
//     .channel("subjects-changes")
//     .on(
//       "postgres_changes",
//       {
//         event: "*",
//         schema: "public",
//         table: "subjects",
//         filter: `user_id=eq.${userId}`,
//       },
//       callback,
//     )
//     .subscribe();

//   return () => {
//     supabase.removeChannel(channel);
//   };
// }

// lib/db/notes.ts - FINAL VERSION - Works with JSONB column
import { getSupabaseClient } from "@/lib/supabase";
import { Note, Subject } from "@/lib/types";

const supabase = getSupabaseClient();

// ==================== SUBJECTS ====================

export async function fetchSubjects(userId: string): Promise<Subject[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching subjects:", error);
    return [];
  }

  return data || [];
}

export async function createSubject(
  userId: string,
  subject: Omit<Subject, "id" | "created_at">,
): Promise<Subject | null> {
  const { data, error } = await supabase
    .from("subjects")
    .insert({
      user_id: userId,
      name: subject.name,
      color: subject.color,
      image: subject.image,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating subject:", error);
    return null;
  }

  return data;
}

export async function updateSubject(
  userId: string,
  subjectId: string,
  updates: Partial<Pick<Subject, "name" | "color" | "image">>,
): Promise<Subject | null> {
  const { data, error } = await supabase
    .from("subjects")
    .update(updates)
    .eq("id", subjectId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating subject:", error);
    return null;
  }

  return data;
}

export async function deleteSubject(
  userId: string,
  subjectId: string,
): Promise<boolean> {
  await supabase
    .from("notes")
    .delete()
    .eq("subject_id", subjectId)
    .eq("user_id", userId);

  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", subjectId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting subject:", error);
    return false;
  }

  return true;
}

// ==================== CONTENT UTILITIES ====================

/**
 * Ensure content is a valid array of blocks
 * Handles both JSONB (object) and legacy TEXT (string) columns
 */
function normalizeContent(content: any): any[] {
  // If it's already an array, return it
  if (Array.isArray(content)) {
    return content;
  }

  // If it's null or undefined, return default
  if (!content) {
    return [
      {
        id: crypto.randomUUID(),
        type: "paragraph",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
        },
        content: [],
        children: [],
      },
    ];
  }

  // If it's a string (legacy TEXT column), try to parse it
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content);

      // If still a string after parse (double-encoded), parse again
      if (typeof parsed === "string") {
        return JSON.parse(parsed);
      }

      // If it's an array now, return it
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse content:", e);
    }
  }

  // Fallback: return default empty block
  return [
    {
      id: crypto.randomUUID(),
      type: "paragraph",
      props: {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
      },
      content: [],
      children: [],
    },
  ];
}

// ==================== NOTES ====================

export async function fetchNotes(userId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching notes:", error);
    return [];
  }

  return (data || []).map((note) => ({
    ...note,
    content: normalizeContent(note.content),
  }));
}

export async function fetchNotesBySubject(
  userId: string,
  subjectId: string,
): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .eq("subject_id", subjectId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching notes by subject:", error);
    return [];
  }

  return (data || []).map((note) => ({
    ...note,
    content: normalizeContent(note.content),
  }));
}

export async function fetchNoteById(
  userId: string,
  noteId: string,
): Promise<Note | null> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching note:", error);
    return null;
  }

  return {
    ...data,
    content: normalizeContent(data.content),
  };
}

export async function createNote(
  userId: string,
  note: {
    subject_id: string;
    title: string;
    content?: any;
    header_image?: string;
  },
): Promise<Note | null> {
  // Ensure content is an array
  const content = note.content
    ? normalizeContent(note.content)
    : [
        {
          id: crypto.randomUUID(),
          type: "paragraph",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
          },
          content: [],
          children: [],
        },
      ];

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      subject_id: note.subject_id,
      title: note.title,
      content: content, // ✅ Pass as array - Supabase handles JSONB
      header_image:
        note.header_image ||
        "https://images.unsplash.com/photo-1516534775068-ba3e7458af70?w=1200&h=400&fit=crop",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating note:", JSON.stringify(error, null, 2));
    return null;
  }

  return {
    ...data,
    content: normalizeContent(data.content),
  };
}

export async function updateNote(
  userId: string,
  noteId: string,
  updates: {
    title?: string;
    content?: any;
    subject_id?: string;
    header_image?: string;
  },
): Promise<Note | null> {
  const preparedUpdates: any = {
    updated_at: new Date().toISOString(),
  };

  // Only add fields that are actually being updated
  if (updates.title !== undefined) {
    preparedUpdates.title = updates.title;
  }
  if (updates.subject_id !== undefined) {
    preparedUpdates.subject_id = updates.subject_id;
  }
  if (updates.header_image !== undefined) {
    preparedUpdates.header_image = updates.header_image;
  }

  // ✅ If content is being updated, ensure it's an array
  if (updates.content !== undefined) {
    preparedUpdates.content = normalizeContent(updates.content);

    console.log("📤 Updating content:", {
      type: typeof preparedUpdates.content,
      isArray: Array.isArray(preparedUpdates.content),
      blocks: preparedUpdates.content.length,
      firstBlock: preparedUpdates.content[0]?.type,
    });
  }

  const { data, error } = await supabase
    .from("notes")
    .update(preparedUpdates)
    .eq("id", noteId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating note:", error);
    return null;
  }

  console.log("📥 Update response:", {
    hasContent: !!data.content,
    contentType: typeof data.content,
  });

  return {
    ...data,
    content: normalizeContent(data.content),
  };
}

export async function deleteNote(
  userId: string,
  noteId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting note:", error);
    return false;
  }

  return true;
}

// ==================== REALTIME SUBSCRIPTIONS ====================

export function subscribeToNotes(
  userId: string,
  callback: (payload: any) => void,
) {
  const channel = supabase
    .channel("notes-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notes",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        // Normalize content in realtime updates
        if (payload.new && "content" in payload.new) {
          const newPayload = payload.new as any;
          newPayload.content = normalizeContent(newPayload.content);
        }
        callback(payload);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToSubjects(
  userId: string,
  callback: (payload: any) => void,
) {
  const channel = supabase
    .channel("subjects-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "subjects",
        filter: `user_id=eq.${userId}`,
      },
      callback,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

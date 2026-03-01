// export type Subject = {
//   id: string;
//   name: string;
//   color: string;
//   totalTime: number;
// };

export type ActiveSession = {
  sessionId: string;
  subjectId: string;
  startTime: string | null;
  accumulatedTime: number;
  running: boolean;
};

// lib/types.ts

// export interface Subject {
//   id: string;
//   user_id: string;
//   name: string;
//   image?: string | null;
//   color: string;
//   created_at: string;
// }

// export interface Session {
//   id: string;
//   user_id: string;
//   subject_id: string | null;
//   start_time: string;
//   end_time: string | null;
//   description?: string | null;
//   is_interrupted: boolean;
//   created_at: string;
// }

// export interface Subject {
//   id: string;
//   user_id: string | null; // ✅ FIX
//   name: string;
//   image: string | null;
//   color: string;
//   created_at: string;
// }
export interface Note {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  content: any;
  header_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  color: string;
  image: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string | null; // ✅ FIX
  subject_id: string | null;
  start_time: string;
  end_time: string | null;
  description?: string | null;
  is_interrupted: boolean;
  created_at: string;
}
export type FocusEventType = "start" | "pause" | "resume" | "stop";

export interface FocusEvent {
  id: string;
  user_id: string | null;
  subject_id: string;
  type: FocusEventType;
  created_at: string;
  client_time: number;
}

// export interface Note {
//   id: string;
//   user_id: string;
//   subject_id: string;
//   title: string;
//   content: any; // JSONB - BlockNote document structure
//   header_image: string | null;
//   created_at: string;
//   updated_at: string;
// }

export type SessionInsert = Omit<Session, "id">;

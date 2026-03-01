// import { FocusEvent } from "@/lib/types";
// import type { FocusState } from "@/store/slices/focusSlice";

// // export function deriveFocusState(events: FocusEvent[]): FocusState {
// //   let accumulatedSeconds = 0;
// //   let lastStartClientTime: number | null = null;
// //   let lastSubjectId: string | null = null;
// //   let status: FocusState["status"] = "idle";

// //   for (const e of events) {
// //     const t = e.client_time ?? new Date(e.created_at).getTime();

// //     if (e.type === "start" || e.type === "resume") {
// //       lastStartClientTime = t;
// //       lastSubjectId = e.subject_id;
// //       status = "running";
// //     }

// //     if (e.type === "pause") {
// //       if (lastStartClientTime !== null) {
// //         accumulatedSeconds += Math.floor((t - lastStartClientTime) / 1000);
// //       }
// //       lastStartClientTime = null;
// //       status = "paused";
// //     }

// //     if (e.type === "stop") {
// //       // 🔥 STOP = HARD RESET
// //       accumulatedSeconds = 0;
// //       lastStartClientTime = null;
// //       lastSubjectId = null;
// //       status = "idle";
// //     }
// //   }

// //   return {
// //     status,
// //     accumulatedSeconds,
// //     lastStartClientTime,
// //     lastSubjectId,
// //   };
// // }

// export function deriveFocusState(events: FocusEvent[]): FocusState {
//   let accumulatedSeconds = 0;
//   let lastStartServerTime: number | null = null;
//   let lastSubjectId: string | null = null;
//   let status: FocusState["status"] = "idle";

//   for (const e of events) {
//     // ✅ ALWAYS use server timestamp (created_at), never client_time
//     const t = new Date(e.created_at).getTime();

//     if (e.type === "start" || e.type === "resume") {
//       lastStartServerTime = t;
//       lastSubjectId = e.subject_id;
//       status = "running";
//     }

//     if (e.type === "pause") {
//       if (lastStartServerTime !== null) {
//         accumulatedSeconds += Math.floor((t - lastStartServerTime) / 1000);
//       }
//       lastStartServerTime = null;
//       status = "paused";
//     }

//     if (e.type === "stop") {
//       // Only accumulate time if there was a running session
//       if (lastStartServerTime !== null) {
//         accumulatedSeconds += Math.floor((t - lastStartServerTime) / 1000);
//       }
//       // 🔥 STOP = HARD RESET
//       accumulatedSeconds = 0;
//       lastStartServerTime = null;
//       lastSubjectId = null;
//       status = "idle";
//     }
//   }

//   return {
//     status,
//     accumulatedSeconds,
//     lastStartClientTime: lastStartServerTime, // Keep same property name for compatibility
//     lastSubjectId,
//   };
// }

import { FocusEvent } from "@/lib/types";
import type { FocusState } from "@/store/slices/focusSlice";

/**
 * ✅ FIXED: Uses server timestamps (created_at) exclusively
 * This ensures all devices show the same time regardless of local clock drift
 */
export function deriveFocusState(events: FocusEvent[]): FocusState {
  let accumulatedSeconds = 0;
  let lastStartServerTime: number | null = null;
  let lastSubjectId: string | null = null;
  let status: FocusState["status"] = "idle";

  for (const e of events) {
    // ✅ ALWAYS use server timestamp (created_at), never client_time
    const serverTime = new Date(e.created_at).getTime();

    if (e.type === "start" || e.type === "resume") {
      lastStartServerTime = serverTime;
      lastSubjectId = e.subject_id;
      status = "running";
    }

    if (e.type === "pause") {
      if (lastStartServerTime !== null) {
        accumulatedSeconds += Math.floor(
          (serverTime - lastStartServerTime) / 1000,
        );
      }
      lastStartServerTime = null;
      status = "paused";
    }

    if (e.type === "stop") {
      // Accumulate time if there was a running session
      if (lastStartServerTime !== null) {
        accumulatedSeconds += Math.floor(
          (serverTime - lastStartServerTime) / 1000,
        );
      }
      // 🔥 STOP = HARD RESET
      accumulatedSeconds = 0;
      lastStartServerTime = null;
      lastSubjectId = null;
      status = "idle";
    }
  }

  return {
    status,
    accumulatedSeconds,
    lastStartClientTime: lastStartServerTime, // Keep property name for compatibility
    lastSubjectId,
  };
}

/**
 * ✅ NEW: Get server time offset for accurate client-side elapsed calculation
 * Call this once on app load to sync with server
 */
export async function getServerTimeOffset(): Promise<number> {
  const clientTime = Date.now();

  try {
    // Make a lightweight request to get server time
    const response = await fetch("/api/server-time", {
      method: "GET",
    });

    if (!response.ok) {
      console.warn("Failed to get server time, using client time");
      return 0;
    }

    const { serverTime } = await response.json();
    const roundTripTime = Date.now() - clientTime;

    // Account for round-trip delay (divide by 2 for one-way latency)
    const estimatedServerTime = serverTime + roundTripTime / 2;
    const offset = estimatedServerTime - Date.now();

    return offset;
  } catch (error) {
    console.error("Error syncing server time:", error);
    return 0;
  }
}

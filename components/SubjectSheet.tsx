"use client";

import { motion, AnimatePresence } from "framer-motion";

export default function SubjectSheet({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (subject: string) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 400, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 400, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 bg-[#0F1424] rounded-t-2xl p-6"
        >
          <div
            className="text-slate-300 mb-4"
            onClick={() => {
              onSelect("Math");
              onClose();
            }}
          >
            ● 📘 Math <span className="text-xs ml-2">Avg: 42 min</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

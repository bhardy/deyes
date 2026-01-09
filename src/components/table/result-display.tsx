"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { TableRow } from "@/types/table";

interface ResultDisplayProps {
  row: TableRow;
  column: string;
  onViewDetails: () => void;
  onNewQuery: () => void;
}

export function ResultDisplay({
  row,
  column,
  onViewDetails,
  onNewQuery,
}: ResultDisplayProps) {
  const value = row.values[column] || "—";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-md px-4"
    >
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <p className="text-lg text-muted-foreground">{row.label}</p>
          <p className="text-sm text-muted-foreground/70">{column}</p>
        </div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            delay: 0.1,
          }}
          className="bg-primary/10 rounded-2xl p-8 text-center"
        >
          <span className="text-5xl font-bold text-primary">{value}</span>
        </motion.div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={onViewDetails}
            variant="outline"
            size="lg"
            className="w-full"
          >
            View All Details
          </Button>
          <Button
            onClick={onNewQuery}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            New Query
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { TableRow } from "@/types/table";

interface RowDetailsProps {
  row: TableRow;
  headers: string[];
  highlightColumn?: string;
  onBack: () => void;
  onNewQuery: () => void;
}

export function RowDetails({
  row,
  headers,
  highlightColumn,
  onBack,
  onNewQuery,
}: RowDetailsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md px-4"
    >
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground">
            {row.label}
          </h2>
        </div>

        <div className="bg-card rounded-xl border overflow-hidden">
          {headers.map((header, index) => {
            const value = row.values[header] || "—";
            const isHighlighted = header === highlightColumn;

            return (
              <motion.div
                key={header}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`flex items-center justify-between px-4 py-3 ${
                  index !== headers.length - 1 ? "border-b" : ""
                } ${isHighlighted ? "bg-primary/10" : ""}`}
              >
                <span className="text-sm text-muted-foreground">{header}</span>
                <span
                  className={`text-sm font-medium ${
                    isHighlighted ? "text-primary" : "text-foreground"
                  }`}
                >
                  {value}
                </span>
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={onBack}
            variant="outline"
            size="lg"
            className="w-full"
          >
            Back to Result
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

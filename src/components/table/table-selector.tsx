"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { ParsedTable } from "@/types/table";

interface TableSelectorProps {
  tables: ParsedTable[];
  onSelect: (index: number) => void;
  onBack: () => void;
}

export function TableSelector({ tables, onSelect, onBack }: TableSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md px-4"
    >
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Found {tables.length} tables
          </h2>
          <p className="text-muted-foreground text-sm">
            Select which table you want to explore
          </p>
        </div>

        <div className="space-y-3">
          {tables.map((table, index) => (
            <motion.button
              key={table.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelect(index)}
              className="w-full p-4 text-left rounded-xl border bg-card hover:bg-accent transition-colors"
            >
              <div className="font-medium text-foreground">
                {table.name || `Table ${index + 1}`}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {table.rows.length} rows, {table.headers.length} columns
              </div>
            </motion.button>
          ))}
        </div>

        <Button
          onClick={onBack}
          variant="ghost"
          size="sm"
          className="w-full"
        >
          Try a different PDF
        </Button>
      </div>
    </motion.div>
  );
}

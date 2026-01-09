"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ParsedTable } from "@/types/table";

interface QueryFormProps {
  table: ParsedTable;
  onQuery: (rowId: string, column: string) => void;
  onBack: () => void;
}

export function QueryForm({ table, onQuery, onBack }: QueryFormProps) {
  const [selectedRow, setSelectedRow] = useState<string>("");
  const [selectedColumn, setSelectedColumn] = useState<string>("");

  const handleSubmit = () => {
    if (selectedRow && selectedColumn) {
      onQuery(selectedRow, selectedColumn);
    }
  };

  const canSubmit = selectedRow && selectedColumn;

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
            What do you want to know?
          </h2>
          <p className="text-muted-foreground text-sm">
            Select an item and a value to look up
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Item (Row)
            </label>
            <Select value={selectedRow} onValueChange={setSelectedRow}>
              <SelectTrigger>
                <SelectValue placeholder="Select an item..." />
              </SelectTrigger>
              <SelectContent>
                {table.rows.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Value (Column)
            </label>
            <Select value={selectedColumn} onValueChange={setSelectedColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Select a value..." />
              </SelectTrigger>
              <SelectContent>
                {table.headers.map((header) => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="lg"
            className="w-full"
          >
            Look Up
          </Button>
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            Try a different PDF
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

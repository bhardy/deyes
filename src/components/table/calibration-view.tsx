"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { RawRow, CalibrationSettings, ParsedTable } from "@/types/table";
import { buildTableFromCalibration } from "@/lib/pdf/table-detector";
import { Button } from "@/components/ui/button";

interface CalibrationViewProps {
  rawRows: RawRow[];
  onComplete: (table: ParsedTable) => void;
  onCancel: () => void;
}

export function CalibrationView({ rawRows, onComplete, onCancel }: CalibrationViewProps) {
  const [step, setStep] = useState<"header" | "label">("header");
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
  const [labelColumnIndex, setLabelColumnIndex] = useState<number | null>(null);

  // Show first 20 rows for selection
  const displayRows = rawRows.slice(0, 20);

  const handleHeaderSelect = (index: number) => {
    setHeaderRowIndex(index);
    setStep("label");
  };

  const handleLabelSelect = (index: number) => {
    setLabelColumnIndex(index);
  };

  const handleConfirm = () => {
    if (headerRowIndex === null || labelColumnIndex === null) return;

    const settings: CalibrationSettings = {
      headerRowIndex,
      labelColumnIndex,
    };

    const table = buildTableFromCalibration(rawRows, settings);

    if (table) {
      onComplete(table);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto px-4"
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          {step === "header" ? "Select the header row" : "Select the label column"}
        </h2>
        <p className="text-gray-500 text-sm">
          {step === "header"
            ? "Tap the row that contains column headers (like Calories, Fat, etc.)"
            : "Tap the column that contains item names (like product names)"}
        </p>
      </div>

      {step === "header" ? (
        <div className="space-y-2 mb-6">
          {displayRows.map((row, rowIndex) => (
            <button
              key={rowIndex}
              onClick={() => handleHeaderSelect(rowIndex)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                headerRowIndex === rowIndex
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="text-xs text-gray-400 mb-1">Row {rowIndex + 1}</div>
              <div className="text-sm font-mono truncate">
                {row.cells.slice(0, 6).join(" | ")}
                {row.cells.length > 6 && " ..."}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Selected header row:</div>
            <div className="text-sm font-mono">
              {rawRows[headerRowIndex!]?.cells.slice(0, 6).join(" | ")}
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <div className="text-sm text-gray-500 mb-2">Tap a column to mark it as the label column:</div>
            <div className="flex flex-wrap gap-2">
              {rawRows[headerRowIndex!]?.cells.map((cell, colIndex) => (
                <button
                  key={colIndex}
                  onClick={() => handleLabelSelect(colIndex)}
                  className={`px-3 py-2 rounded-lg border transition-colors text-sm ${
                    labelColumnIndex === colIndex
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="text-xs text-gray-400 mb-0.5">Col {colIndex + 1}</div>
                  <div className="font-mono truncate max-w-[120px]">{cell || "(empty)"}</div>
                </button>
              ))}
            </div>
          </div>

          {labelColumnIndex !== null && (
            <div className="mb-6 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-700">
                Using "{rawRows[headerRowIndex!]?.cells[labelColumnIndex]}" as item labels
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex gap-3">
        {step === "label" && (
          <Button
            variant="outline"
            onClick={() => setStep("header")}
            className="flex-1"
          >
            Back
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        {step === "label" && labelColumnIndex !== null && (
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
          >
            Confirm
          </Button>
        )}
      </div>
    </motion.div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import type { RawRow, CalibrationSettings, ParsedTable } from "@/types/table";
import { buildTableFromCalibration } from "@/lib/pdf/table-detector";
import { Button } from "@/components/ui/button";

interface CalibrationViewProps {
  rawRows: RawRow[];
  onComplete: (table: ParsedTable) => void;
  onCancel: () => void;
}

// Keywords that suggest a row is a header
const HEADER_KEYWORDS = ["calorie", "fat", "sodium", "carb", "protein", "sugar", "fiber", "serving", "weight", "cholesterol"];

export function CalibrationView({ rawRows, onComplete, onCancel }: CalibrationViewProps) {
  const [step, setStep] = useState<"header" | "label">("header");
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
  const [labelColumnIndex, setLabelColumnIndex] = useState<number | null>(null);

  // Find rows that look like headers (contain nutrition-related keywords)
  const likelyHeaderRows = useMemo(() => {
    const indices: number[] = [];
    rawRows.forEach((row, index) => {
      const rowText = row.cells.join(" ").toLowerCase();
      const matchCount = HEADER_KEYWORDS.filter(kw => rowText.includes(kw)).length;
      if (matchCount >= 2) {
        indices.push(index);
      }
    });
    return indices;
  }, [rawRows]);

  // Show first 50 rows for selection, but prioritize likely headers
  const displayRows = useMemo(() => {
    // Show likely header rows first, then the rest
    const headerRows = likelyHeaderRows.map(i => ({ row: rawRows[i], originalIndex: i }));
    const otherRows = rawRows
      .slice(0, 50)
      .map((row, i) => ({ row, originalIndex: i }))
      .filter(r => !likelyHeaderRows.includes(r.originalIndex));

    return [...headerRows, ...otherRows];
  }, [rawRows, likelyHeaderRows]);

  const handleHeaderSelect = (originalIndex: number) => {
    setHeaderRowIndex(originalIndex);
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
      className="w-full max-w-2xl mx-auto px-4 max-h-[80dvh] overflow-y-auto"
    >
      <div className="mb-4 sticky top-0 bg-background py-2 z-10">
        <h2 className="text-xl font-semibold mb-1">
          {step === "header" ? "Select the header row" : "Select the label column"}
        </h2>
        <p className="text-gray-500 text-sm">
          {step === "header"
            ? "Find and tap the row with column names like Calories, Fat, Sodium..."
            : "Tap the column that contains item names (product names)"}
        </p>
        {step === "header" && likelyHeaderRows.length > 0 && (
          <p className="text-blue-600 text-sm mt-1">
            Found {likelyHeaderRows.length} likely header row(s) - shown first
          </p>
        )}
      </div>

      {step === "header" ? (
        <div className="space-y-2 mb-6 pb-20">
          {displayRows.map(({ row, originalIndex }) => {
            const isLikelyHeader = likelyHeaderRows.includes(originalIndex);
            return (
              <button
                key={originalIndex}
                onClick={() => handleHeaderSelect(originalIndex)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  headerRowIndex === originalIndex
                    ? "border-blue-500 bg-blue-50"
                    : isLikelyHeader
                    ? "border-green-400 bg-green-50 hover:border-green-500"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-400">Row {originalIndex + 1}</span>
                  <span className="text-xs text-gray-400">{row.cells.length} cells</span>
                </div>
                <div className="text-sm font-mono overflow-x-auto whitespace-nowrap pb-1">
                  {row.cells.join(" | ")}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Selected header row ({rawRows[headerRowIndex!]?.cells.length} columns):</div>
            <div className="text-sm font-mono overflow-x-auto whitespace-nowrap">
              {rawRows[headerRowIndex!]?.cells.join(" | ")}
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <div className="text-sm text-gray-500 mb-2">Tap the column with product/item names:</div>
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
                  <div className="font-mono truncate max-w-[150px]">{cell || "(empty)"}</div>
                </button>
              ))}
            </div>
          </div>

          {labelColumnIndex !== null && (
            <div className="mb-6 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-700">
                Using "{rawRows[headerRowIndex!]?.cells[labelColumnIndex] || "(empty)"}" as item labels
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex gap-3 sticky bottom-0 bg-background py-4">
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

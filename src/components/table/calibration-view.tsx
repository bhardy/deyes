"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import type { TextItem, ParsedTable, TableRow } from "@/types/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CalibrationViewProps {
  rawItems: TextItem[];
  onComplete: (table: ParsedTable) => void;
  onCancel: () => void;
}

// Keywords that suggest a text item is a column header
const HEADER_KEYWORDS = [
  "calorie", "fat", "sodium", "carb", "protein", "sugar", "fiber",
  "serving", "weight", "cholesterol", "vitamin", "calcium", "iron"
];

// Find likely column headers (items near the top with nutrition keywords)
function findLikelyHeaders(items: TextItem[]): TextItem[] {
  // Get unique strings with their positions
  const uniqueItems = new Map<string, TextItem>();

  for (const item of items) {
    const text = item.str.trim();
    if (text.length < 2) continue;

    // Keep the item with smallest Y (topmost occurrence)
    const existing = uniqueItems.get(text);
    if (!existing || item.y < existing.y) {
      uniqueItems.set(text, item);
    }
  }

  // Filter to items that look like headers
  const headers: TextItem[] = [];
  for (const item of uniqueItems.values()) {
    const textLower = item.str.toLowerCase();
    const isLikelyHeader = HEADER_KEYWORDS.some(kw => textLower.includes(kw));
    if (isLikelyHeader) {
      headers.push(item);
    }
  }

  // Sort by X position (left to right)
  return headers.sort((a, b) => a.x - b.x);
}

// Find likely row labels (items on the left side)
function findLikelyRowLabels(items: TextItem[], headerY: number): TextItem[] {
  // Get all items below the header line
  const belowHeader = items.filter(item => item.y > headerY + 10);

  // Find the minimum X position (leftmost column)
  const minX = Math.min(...belowHeader.map(i => i.x));

  // Get items in the leftmost column area
  const leftColumnItems = belowHeader.filter(item =>
    item.x < minX + 50 && item.str.trim().length > 2
  );

  // Get unique strings
  const uniqueLabels = new Map<string, TextItem>();
  for (const item of leftColumnItems) {
    const text = item.str.trim();
    if (!uniqueLabels.has(text)) {
      uniqueLabels.set(text, item);
    }
  }

  // Sort by Y position (top to bottom)
  return Array.from(uniqueLabels.values()).sort((a, b) => a.y - b.y);
}

// Find the cell value at the intersection of a header column and row
function findCellValue(
  items: TextItem[],
  headerItem: TextItem,
  rowItem: TextItem,
  tolerance: number = 30
): string | null {
  // Look for items that are:
  // - Near the header's X position (same column)
  // - Near the row's Y position (same row)
  const candidates = items.filter(item => {
    const xMatch = Math.abs(item.x - headerItem.x) < tolerance;
    const yMatch = Math.abs(item.y - rowItem.y) < tolerance;
    return xMatch && yMatch && item.str.trim().length > 0;
  });

  if (candidates.length === 0) return null;

  // Return the closest match
  candidates.sort((a, b) => {
    const distA = Math.abs(a.x - headerItem.x) + Math.abs(a.y - rowItem.y);
    const distB = Math.abs(b.x - headerItem.x) + Math.abs(b.y - rowItem.y);
    return distA - distB;
  });

  return candidates[0].str.trim();
}

// Build a table from selected header and row items
function buildTableFromSelection(
  items: TextItem[],
  selectedHeaders: TextItem[],
  rowLabels: TextItem[]
): ParsedTable {
  const headers = selectedHeaders.map(h => h.str.trim());
  const rows: TableRow[] = [];

  for (let i = 0; i < rowLabels.length; i++) {
    const rowItem = rowLabels[i];
    const label = rowItem.str.trim();
    const values: Record<string, string> = {};

    for (const headerItem of selectedHeaders) {
      const headerName = headerItem.str.trim();
      const value = findCellValue(items, headerItem, rowItem);
      values[headerName] = value || "";
    }

    rows.push({
      id: `row-${i}`,
      label,
      values,
    });
  }

  return {
    id: "calibrated-table",
    headers,
    rows,
  };
}

export function CalibrationView({ rawItems, onComplete, onCancel }: CalibrationViewProps) {
  const [step, setStep] = useState<"headers" | "rows" | "confirm">("headers");
  const [selectedHeaders, setSelectedHeaders] = useState<TextItem[]>([]);
  const [headerSearch, setHeaderSearch] = useState("");
  const [rowSearch, setRowSearch] = useState("");

  // Find likely headers
  const likelyHeaders = useMemo(() => findLikelyHeaders(rawItems), [rawItems]);

  // Find row labels based on selected headers
  const rowLabels = useMemo(() => {
    if (selectedHeaders.length === 0) return [];
    const minHeaderY = Math.min(...selectedHeaders.map(h => h.y));
    return findLikelyRowLabels(rawItems, minHeaderY);
  }, [rawItems, selectedHeaders]);

  // Filter headers by search
  const filteredHeaders = useMemo(() => {
    if (!headerSearch) return likelyHeaders;
    const search = headerSearch.toLowerCase();
    return likelyHeaders.filter(h => h.str.toLowerCase().includes(search));
  }, [likelyHeaders, headerSearch]);

  // Filter rows by search
  const filteredRows = useMemo(() => {
    if (!rowSearch) return rowLabels.slice(0, 50);
    const search = rowSearch.toLowerCase();
    return rowLabels.filter(r => r.str.toLowerCase().includes(search)).slice(0, 50);
  }, [rowLabels, rowSearch]);

  const toggleHeader = (header: TextItem) => {
    setSelectedHeaders(prev => {
      const exists = prev.find(h => h.str === header.str);
      if (exists) {
        return prev.filter(h => h.str !== header.str);
      }
      return [...prev, header];
    });
  };

  const handleConfirm = () => {
    if (selectedHeaders.length === 0) return;

    const table = buildTableFromSelection(rawItems, selectedHeaders, rowLabels);
    onComplete(table);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto px-4 max-h-[85dvh] overflow-y-auto"
    >
      <div className="sticky top-0 bg-background py-3 z-10 border-b mb-4">
        <h2 className="text-xl font-semibold mb-1">
          {step === "headers" && "Step 1: Select column headers"}
          {step === "rows" && "Step 2: Review detected items"}
          {step === "confirm" && "Step 3: Confirm selection"}
        </h2>
        <p className="text-gray-500 text-sm">
          {step === "headers" && "Select the nutritional values you want to query (e.g., Calories, Fat, Sodium)"}
          {step === "rows" && `Found ${rowLabels.length} menu items. Review and continue.`}
          {step === "confirm" && "Confirm your selection to start querying"}
        </p>
      </div>

      {step === "headers" && (
        <>
          <div className="mb-4">
            <Input
              placeholder="Search headers..."
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              className="w-full"
            />
          </div>

          {selectedHeaders.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-700 mb-2">Selected ({selectedHeaders.length}):</div>
              <div className="flex flex-wrap gap-2">
                {selectedHeaders.map(h => (
                  <span key={h.str} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    {h.str}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-sm text-gray-500 mb-2">
            Found {likelyHeaders.length} likely column headers:
          </div>

          <div className="flex flex-wrap gap-2 mb-6 pb-20">
            {filteredHeaders.map((header, idx) => {
              const isSelected = selectedHeaders.some(h => h.str === header.str);
              return (
                <button
                  key={`${header.str}-${idx}`}
                  onClick={() => toggleHeader(header)}
                  className={`px-3 py-2 rounded-lg border transition-colors text-sm ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {header.str}
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === "rows" && (
        <>
          <div className="mb-4">
            <Input
              placeholder="Search items..."
              value={rowSearch}
              onChange={(e) => setRowSearch(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="text-sm text-gray-500 mb-2">
            Menu items found (showing {filteredRows.length} of {rowLabels.length}):
          </div>

          <div className="space-y-1 mb-6 pb-20">
            {filteredRows.map((row, idx) => (
              <div
                key={`${row.str}-${idx}`}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
              >
                {row.str}
              </div>
            ))}
          </div>
        </>
      )}

      {step === "confirm" && (
        <div className="mb-6 pb-20">
          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <div className="font-medium mb-2">Selected columns:</div>
            <div className="flex flex-wrap gap-2">
              {selectedHeaders.map(h => (
                <span key={h.str} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {h.str}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="font-medium mb-2">Menu items: {rowLabels.length}</div>
            <div className="text-sm text-gray-600">
              Sample: {rowLabels.slice(0, 5).map(r => r.str).join(", ")}
              {rowLabels.length > 5 && "..."}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 sticky bottom-0 bg-background py-4 border-t">
        {step !== "headers" && (
          <Button
            variant="outline"
            onClick={() => setStep(step === "confirm" ? "rows" : "headers")}
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
        {step === "headers" && selectedHeaders.length > 0 && (
          <Button
            onClick={() => setStep("rows")}
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
          >
            Next ({selectedHeaders.length} selected)
          </Button>
        )}
        {step === "rows" && (
          <Button
            onClick={() => setStep("confirm")}
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
          >
            Next
          </Button>
        )}
        {step === "confirm" && (
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-green-600 text-white hover:bg-green-700"
          >
            Confirm & Query
          </Button>
        )}
      </div>
    </motion.div>
  );
}

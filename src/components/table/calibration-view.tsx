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

// Section headers to exclude from row items
const SECTION_KEYWORDS = [
  "toppings", "appetizers", "wings", "salads", "dressings", "wraps",
  "pastas", "meat", "chicken", "veggie", "cheese", "desserts", "beverages",
  "kids", "pizzas", "nutrition facts", "daily value"
];

interface HeaderItem {
  text: string;
  item: TextItem;
}

interface RowItem {
  text: string;
  item: TextItem;
  section?: string;
}

// Find likely column headers
function findHeaders(items: TextItem[]): HeaderItem[] {
  const uniqueHeaders = new Map<string, TextItem>();

  for (const item of items) {
    const text = item.str.trim();
    if (text.length < 2) continue;

    const textLower = text.toLowerCase();
    const isHeader = HEADER_KEYWORDS.some(kw => textLower.includes(kw));

    if (isHeader && !uniqueHeaders.has(text)) {
      uniqueHeaders.set(text, item);
    }
  }

  return Array.from(uniqueHeaders.entries())
    .map(([text, item]) => ({ text, item }))
    .sort((a, b) => a.item.x - b.item.x);
}

// Find likely row items (menu items, not section headers)
function findRowItems(items: TextItem[], headerY: number): RowItem[] {
  // Get items below the header area (use small offset since rows can be close to headers)
  const belowHeader = items.filter(item => item.y > headerY + 5);

  if (belowHeader.length === 0) return [];

  // Find the leftmost X position
  const minX = Math.min(...belowHeader.map(i => i.x));

  // Get items in the left column
  const leftItems = belowHeader.filter(item =>
    item.x < minX + 100 && item.str.trim().length > 2
  );

  // Deduplicate and categorize
  const seen = new Set<string>();
  const rowItems: RowItem[] = [];
  let currentSection = "";

  // Sort by Y position
  const sorted = [...leftItems].sort((a, b) => a.y - b.y);

  for (const item of sorted) {
    const text = item.str.trim();
    if (seen.has(text)) continue;
    seen.add(text);

    const textLower = text.toLowerCase();

    // Check if this is a section header (must be short and match keyword patterns)
    // Long items like "Mozzarella Cheese PPP" should not be treated as sections
    const isSection = text.length < 25 && SECTION_KEYWORDS.some(kw =>
      textLower === kw ||
      textLower.startsWith(kw + " ") ||
      textLower.endsWith(" " + kw) ||
      textLower === kw.toUpperCase()
    );

    if (isSection) {
      currentSection = text;
    } else {
      rowItems.push({
        text,
        item,
        section: currentSection || undefined,
      });
    }
  }

  return rowItems;
}

// Find cell value at intersection
function findCellValue(
  items: TextItem[],
  headerItem: TextItem,
  rowItem: TextItem
): string | null {
  // Look for items near the intersection
  const candidates = items.filter(item => {
    const xDiff = Math.abs(item.x - headerItem.x);
    const yDiff = Math.abs(item.y - rowItem.y);
    return xDiff < 40 && yDiff < 15 && item.str.trim().length > 0;
  });

  if (candidates.length === 0) return null;

  // Sort by distance and return closest
  candidates.sort((a, b) => {
    const distA = Math.abs(a.x - headerItem.x) + Math.abs(a.y - rowItem.y);
    const distB = Math.abs(b.x - headerItem.x) + Math.abs(b.y - rowItem.y);
    return distA - distB;
  });

  return candidates[0].str.trim();
}

// Get all values for a row
function getAllRowValues(
  items: TextItem[],
  headers: HeaderItem[],
  rowItem: TextItem
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const header of headers) {
    const value = findCellValue(items, header.item, rowItem);
    if (value) {
      values[header.text] = value;
    }
  }

  return values;
}

export function CalibrationView({ rawItems, onComplete, onCancel }: CalibrationViewProps) {
  const [step, setStep] = useState<"header" | "row" | "result">("header");
  const [selectedHeader, setSelectedHeader] = useState<HeaderItem | null>(null);
  const [selectedRow, setSelectedRow] = useState<RowItem | null>(null);
  const [showAllValues, setShowAllValues] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [rowSearch, setRowSearch] = useState("");

  // Find headers
  const headers = useMemo(() => findHeaders(rawItems), [rawItems]);

  // Find row items (based on header position)
  const rowItems = useMemo(() => {
    if (headers.length === 0) return [];
    const minHeaderY = Math.min(...headers.map(h => h.item.y));
    return findRowItems(rawItems, minHeaderY);
  }, [rawItems, headers]);

  // Filter headers by search
  const filteredHeaders = useMemo(() => {
    if (!headerSearch) return headers;
    const search = headerSearch.toLowerCase();
    return headers.filter(h => h.text.toLowerCase().includes(search));
  }, [headers, headerSearch]);

  // Filter rows by search
  const filteredRows = useMemo(() => {
    if (!rowSearch) return rowItems.slice(0, 100);
    const search = rowSearch.toLowerCase();
    return rowItems.filter(r => r.text.toLowerCase().includes(search)).slice(0, 100);
  }, [rowItems, rowSearch]);

  // Get result value
  const resultValue = useMemo(() => {
    if (!selectedHeader || !selectedRow) return null;
    return findCellValue(rawItems, selectedHeader.item, selectedRow.item);
  }, [rawItems, selectedHeader, selectedRow]);

  // Get all values for the row
  const allValues = useMemo(() => {
    if (!selectedRow) return {};
    return getAllRowValues(rawItems, headers, selectedRow.item);
  }, [rawItems, headers, selectedRow]);

  const handleHeaderSelect = (header: HeaderItem) => {
    setSelectedHeader(header);
    setStep("row");
  };

  const handleRowSelect = (row: RowItem) => {
    setSelectedRow(row);
    setStep("result");
  };

  const handleBack = () => {
    if (step === "row") {
      setStep("header");
      setSelectedHeader(null);
    } else if (step === "result") {
      setStep("row");
      setSelectedRow(null);
      setShowAllValues(false);
    }
  };

  const handleRestart = () => {
    setStep("header");
    setSelectedHeader(null);
    setSelectedRow(null);
    setShowAllValues(false);
    setHeaderSearch("");
    setRowSearch("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg mx-auto px-4"
    >
      {step === "header" && (
        <>
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-1">What do you want to know?</h2>
            <p className="text-gray-500 text-sm">Select a nutritional value</p>
          </div>

          <div className="mb-4">
            <Input
              placeholder="Search (e.g., calories, fat, sodium)..."
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-6 max-h-[50dvh] overflow-y-auto pb-4">
            {filteredHeaders.map((header, idx) => (
              <button
                key={`${header.text}-${idx}`}
                onClick={() => handleHeaderSelect(header)}
                className="px-4 py-2 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm"
              >
                {header.text}
              </button>
            ))}
            {filteredHeaders.length === 0 && (
              <p className="text-gray-500 text-sm">No matching headers found</p>
            )}
          </div>

          <Button variant="outline" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </>
      )}

      {step === "row" && (
        <>
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-1">Select an item</h2>
            <p className="text-gray-500 text-sm">
              Looking for: <span className="font-medium text-blue-600">{selectedHeader?.text}</span>
            </p>
          </div>

          <div className="mb-4">
            <Input
              placeholder="Search items..."
              value={rowSearch}
              onChange={(e) => setRowSearch(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-1 mb-6 max-h-[50dvh] overflow-y-auto pb-4">
            {filteredRows.map((row, idx) => (
              <button
                key={`${row.text}-${idx}`}
                onClick={() => handleRowSelect(row)}
                className="w-full text-left px-4 py-2 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm"
              >
                {row.section && (
                  <span className="text-xs text-gray-400 block">{row.section}</span>
                )}
                {row.text}
              </button>
            ))}
            {filteredRows.length === 0 && (
              <p className="text-gray-500 text-sm">No matching items found</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleBack} className="flex-1">
              Back
            </Button>
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </>
      )}

      {step === "result" && (
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{selectedRow?.text}</h2>

          {!showAllValues ? (
            <>
              <div className="text-lg mb-6">
                <span className="text-gray-500">{selectedHeader?.text}:</span>{" "}
                <span className="font-semibold text-2xl">{resultValue || "N/A"}</span>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => setShowAllValues(true)}
                  variant="outline"
                  className="w-full"
                >
                  Show more
                </Button>
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="w-full"
                >
                  Go back
                </Button>
                <Button
                  onClick={handleRestart}
                  variant="outline"
                  className="w-full"
                >
                  Restart
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-left space-y-2 mb-6 max-h-[50dvh] overflow-y-auto">
                {Object.entries(allValues).map(([key, value]) => (
                  <div
                    key={key}
                    className={`px-4 py-2 rounded-lg ${
                      key === selectedHeader?.text
                        ? "bg-blue-50 border border-blue-200"
                        : "bg-gray-50"
                    }`}
                  >
                    <span className="text-gray-500">{key}:</span>{" "}
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => setShowAllValues(false)}
                  variant="outline"
                  className="w-full"
                >
                  Show less
                </Button>
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="w-full"
                >
                  Go back
                </Button>
                <Button
                  onClick={handleRestart}
                  variant="outline"
                  className="w-full"
                >
                  Restart
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

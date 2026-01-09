"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  LoadingScreen,
  QueryForm,
  ResultDisplay,
  RowDetails,
  TableSelector,
} from "@/components/table";
import type { ParseResult, ParseResponse, TableRow } from "@/types/table";

type ViewState =
  | "input"
  | "loading"
  | "select-table"
  | "query"
  | "result"
  | "details";

interface HomeContentProps {
  initialStarted?: boolean;
}

export function HomeContent({ initialStarted = false }: HomeContentProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isStarted, setIsStarted] = useState(initialStarted);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>("input");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedTableIndex, setSelectedTableIndex] = useState(0);
  const [selectedRow, setSelectedRow] = useState<TableRow | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);

  const handleStart = () => {
    setIsStarted(true);
    window.history.pushState(null, "", "/start");
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setError(null);
    setView("loading");

    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data: ParseResponse = await response.json();

      if (!data.success) {
        setError(data.error.message);
        setView("input");
        return;
      }

      setParseResult(data.data);

      // If multiple tables, show selector; otherwise go to query
      if (data.data.tables.length > 1) {
        setSelectedTableIndex(0);
        setView("select-table");
      } else {
        setSelectedTableIndex(0);
        setView("query");
      }
    } catch {
      setError("Failed to connect. Please try again.");
      setView("input");
    }
  };

  const handleReset = () => {
    setUrl("");
    setError(null);
    setView("input");
    setParseResult(null);
    setSelectedTableIndex(0);
    setSelectedRow(null);
    setSelectedColumn(null);
  };

  const handleTableSelect = (index: number) => {
    setSelectedTableIndex(index);
    setView("query");
  };

  const handleQuery = (rowId: string, column: string) => {
    if (!parseResult) return;
    const table = parseResult.tables[selectedTableIndex];
    const row = table.rows.find((r) => r.id === rowId);
    if (row) {
      setSelectedRow(row);
      setSelectedColumn(column);
      setView("result");
    }
  };

  const handleNewQuery = () => {
    setSelectedRow(null);
    setSelectedColumn(null);
    setView("query");
  };

  const currentTable = parseResult?.tables[selectedTableIndex];

  const renderContent = () => {
    switch (view) {
      case "input":
        return (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md px-4"
          >
            <form onSubmit={handleSubmit}>
              <div className="relative">
                {/* Input underneath */}
                <input
                  ref={inputRef}
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste PDF URL..."
                  className="w-full h-14 rounded-lg border-2 border-primary bg-background px-6 text-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />

                {/* Button on top */}
                <motion.button
                  type="button"
                  onClick={handleStart}
                  className="absolute inset-0 h-14 rounded-lg bg-primary text-primary-foreground text-lg font-medium shadow hover:bg-primary/90"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: isStarted ? 0 : 1 }}
                  transition={{ duration: 0.2 }}
                  style={{ pointerEvents: isStarted ? "none" : "auto" }}
                >
                  Start
                </motion.button>
              </div>

              {isStarted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4"
                >
                  <Button
                    type="submit"
                    disabled={!url.trim()}
                    className="w-full"
                    size="lg"
                  >
                    Parse PDF
                  </Button>
                </motion.div>
              )}

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 text-center text-sm text-destructive"
                >
                  {error}
                </motion.p>
              )}
            </form>
          </motion.div>
        );

      case "loading":
        return <LoadingScreen key="loading" />;

      case "select-table":
        return parseResult ? (
          <TableSelector
            key="select-table"
            tables={parseResult.tables}
            onSelect={handleTableSelect}
            onBack={handleReset}
          />
        ) : null;

      case "query":
        return currentTable ? (
          <QueryForm
            key="query"
            table={currentTable}
            onQuery={handleQuery}
            onBack={handleReset}
          />
        ) : null;

      case "result":
        return selectedRow && selectedColumn ? (
          <ResultDisplay
            key="result"
            row={selectedRow}
            column={selectedColumn}
            onViewDetails={() => setView("details")}
            onNewQuery={handleNewQuery}
          />
        ) : null;

      case "details":
        return selectedRow && currentTable ? (
          <RowDetails
            key="details"
            row={selectedRow}
            headers={currentTable.headers}
            highlightColumn={selectedColumn || undefined}
            onBack={() => setView("result")}
            onNewQuery={handleNewQuery}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex justify-end p-4 shrink-0">
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center overflow-y-auto">
        {view === "input" && (
          <motion.h1
            className="text-6xl font-bold text-foreground mb-8"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
          >
            deyes
          </motion.h1>
        )}

        <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
      </main>
    </div>
  );
}

"use client";

import type { TextItem, ParseResult, RawRow } from "@/types/table";
import { detectTables, extractRawRows } from "./table-detector";

interface PDFTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

/**
 * Parses a PDF file on the client side
 */
export async function parsePdfFile(file: File): Promise<ParseResult> {
  console.log("Starting PDF parse for:", file.name);

  // Dynamic import to avoid SSR issues
  console.log("Importing pdfjs-dist...");
  const pdfjsLib = await import("pdfjs-dist");
  console.log("pdfjs-dist imported, version:", pdfjsLib.version);

  // Use local worker file
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  console.log("Worker configured");

  console.log("Reading file...");
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  console.log("File read, size:", data.length);

  console.log("Loading PDF document...");
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  console.log("PDF loaded, pages:", pdf.numPages);

  const allItems: TextItem[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    console.log("Processing page", pageNum);
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    for (const item of textContent.items) {
      if (!("str" in item) || !item.str.trim()) continue;

      const textItem = item as PDFTextItem;
      const [, , , , tx, ty] = textItem.transform;

      const x = tx;
      const y = viewport.height - ty;

      allItems.push({
        str: textItem.str,
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        width: Math.round(textItem.width * 100) / 100,
        height: Math.round(textItem.height * 100) / 100,
      });
    }
  }

  console.log("Extracted text items:", allItems.length);
  console.log("Sample items:", allItems.slice(0, 10));

  // Extract raw rows for calibration mode
  const rawRows = extractRawRows(allItems);
  console.log("Extracted raw rows:", rawRows.length);
  console.log("Sample raw rows:", rawRows.slice(0, 5).map(r => ({
    cells: r.cells.slice(0, 5),
    y: r.y
  })));

  // Attempt automatic table detection
  const tables = detectTables(allItems);

  console.log("Detected tables:", tables.length);
  tables.forEach((table, i) => {
    console.log(`Table ${i}:`, {
      headers: table.headers,
      rowCount: table.rows.length,
      sampleRows: table.rows.slice(0, 3).map((r) => ({
        id: r.id,
        label: r.label,
        values: r.values,
      })),
    });
  });

  // Return with raw rows for calibration (even if no tables detected)
  return {
    sourceUrl: file.name,
    tables,
    rawRows,
    parsedAt: new Date().toISOString(),
  };
}

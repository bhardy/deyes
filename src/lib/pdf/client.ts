"use client";

import type { TextItem, ParseResult } from "@/types/table";
import { detectTables } from "./table-detector";

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
  // Dynamic import to avoid SSR issues - pdfjs-dist uses DOM APIs
  const pdfjsLib = await import("pdfjs-dist");

  // Disable worker to avoid cross-origin issues on Vercel
  // Runs on main thread - fine for small/medium PDFs
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";

  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  const pdf = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;
  const allItems: TextItem[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
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

  if (tables.length === 0) {
    throw new Error("No tables found in this PDF.");
  }

  return {
    sourceUrl: file.name,
    tables,
    parsedAt: new Date().toISOString(),
  };
}

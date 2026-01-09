"use client";

import * as pdfjsLib from "pdfjs-dist";
import type { TextItem, ParsedTable, ParseResult } from "@/types/table";
import { detectTables } from "./table-detector";

// Set up the worker for client-side PDF.js
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

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
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  const pdf = await pdfjsLib.getDocument({ data }).promise;
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

  const tables = detectTables(allItems);

  if (tables.length === 0) {
    throw new Error("No tables found in this PDF.");
  }

  return {
    sourceUrl: file.name,
    tables,
    parsedAt: new Date().toISOString(),
  };
}

// Use legacy build for Node.js compatibility (Vercel serverless)
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "@/types/table";

interface PDFTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

/**
 * Fetches a PDF from a URL and extracts all text items with positions
 */
export async function extractTextFromUrl(url: string): Promise<TextItem[]> {
  // Fetch the PDF
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && !contentType.includes("pdf")) {
    throw new Error("URL does not point to a PDF file");
  }

  const arrayBuffer = await response.arrayBuffer();
  return extractTextFromBuffer(arrayBuffer);
}

/**
 * Extracts text items with positions from a PDF buffer
 */
export async function extractTextFromBuffer(
  buffer: ArrayBuffer
): Promise<TextItem[]> {
  const data = new Uint8Array(buffer);
  const pdf = await getDocument({ data, useSystemFonts: true }).promise;

  const allItems: TextItem[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    for (const item of textContent.items) {
      // Skip non-text items
      if (!("str" in item) || !item.str.trim()) continue;

      const textItem = item as PDFTextItem;

      // Transform matrix: [scaleX, skewX, skewY, scaleY, translateX, translateY]
      const [, , , , tx, ty] = textItem.transform;

      // Convert PDF coordinates (origin bottom-left) to screen coordinates (origin top-left)
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

  return allItems;
}

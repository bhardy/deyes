import { extractTextFromUrl, extractTextFromBuffer } from "./extract";
import { detectTables } from "./table-detector";
import type { ParseResult, ParseError } from "@/types/table";

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Parses a PDF from a URL and extracts tables
 */
export async function parsePdfFromUrl(url: string): Promise<ParseResult> {
  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    const error: ParseError = {
      type: "INVALID_URL",
      message: "Please enter a valid PDF URL",
    };
    throw error;
  }

  // Only allow http/https
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    const error: ParseError = {
      type: "INVALID_URL",
      message: "URL must use http or https protocol",
    };
    throw error;
  }

  // Fetch and check size
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TableReader/1.0)",
      },
    });
  } catch {
    const error: ParseError = {
      type: "FETCH_FAILED",
      message: "Couldn't access this PDF. Make sure the URL is public.",
    };
    throw error;
  }

  if (!response.ok) {
    const error: ParseError = {
      type: "FETCH_FAILED",
      message: `Couldn't access this PDF. Server returned ${response.status}.`,
    };
    throw error;
  }

  // Check content type
  const contentType = response.headers.get("content-type");
  if (contentType && !contentType.includes("pdf") && !contentType.includes("octet-stream")) {
    const error: ParseError = {
      type: "NOT_A_PDF",
      message: "This doesn't appear to be a PDF file.",
    };
    throw error;
  }

  // Check size from header if available
  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > MAX_PDF_SIZE) {
    const error: ParseError = {
      type: "TOO_LARGE",
      message: "This PDF is too large. Maximum size is 10MB.",
    };
    throw error;
  }

  // Get the buffer
  const arrayBuffer = await response.arrayBuffer();

  if (arrayBuffer.byteLength > MAX_PDF_SIZE) {
    const error: ParseError = {
      type: "TOO_LARGE",
      message: "This PDF is too large. Maximum size is 10MB.",
    };
    throw error;
  }

  // Extract text
  let textItems;
  try {
    textItems = await extractTextFromBuffer(arrayBuffer);
  } catch {
    const error: ParseError = {
      type: "PARSE_FAILED",
      message: "Couldn't read tables from this PDF. Try a different file.",
    };
    throw error;
  }

  // Detect tables
  const tables = detectTables(textItems);

  if (tables.length === 0) {
    const error: ParseError = {
      type: "NO_TABLES",
      message: "No tables found in this PDF.",
    };
    throw error;
  }

  return {
    sourceUrl: url,
    tables,
    parsedAt: new Date().toISOString(),
  };
}

export { extractTextFromUrl, extractTextFromBuffer } from "./extract";
export { detectTables } from "./table-detector";

// Types for PDF table parsing and display

export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TableRow {
  id: string;
  label: string; // First column (row identifier)
  values: Record<string, string>; // Column header → value mapping
}

export interface ParsedTable {
  id: string;
  name?: string; // Optional table title if detected
  headers: string[]; // Column headers
  rows: TableRow[];
}

export interface ParseResult {
  sourceUrl: string;
  tables: ParsedTable[];
  parsedAt: string;
}

export interface ParseError {
  type:
    | "INVALID_URL"
    | "FETCH_FAILED"
    | "NOT_A_PDF"
    | "PARSE_FAILED"
    | "NO_TABLES"
    | "TOO_LARGE";
  message: string;
}

// API response types
export interface ParseSuccessResponse {
  success: true;
  data: ParseResult;
}

export interface ParseErrorResponse {
  success: false;
  error: ParseError;
}

export type ParseResponse = ParseSuccessResponse | ParseErrorResponse;

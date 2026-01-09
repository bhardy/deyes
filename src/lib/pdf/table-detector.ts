import type { TextItem, ParsedTable, TableRow } from "@/types/table";

// Tolerance for grouping items into rows (pixels) - reduced for tighter grouping
const Y_TOLERANCE = 3;
// Tolerance for detecting column boundaries (pixels)
const X_TOLERANCE = 10;
// Minimum gap between tables (pixels)
const TABLE_GAP_THRESHOLD = 30;
// Minimum rows to be considered a table
const MIN_TABLE_ROWS = 2;
// Minimum columns for a valid table
const MIN_COLUMNS = 3;

/**
 * Groups text items into rows based on Y position
 */
function groupIntoRows(items: TextItem[]): TextItem[][] {
  if (items.length === 0) return [];

  // Sort by Y position first
  const sorted = [...items].sort((a, b) => a.y - b.y);

  const rows: TextItem[][] = [];
  let currentRow: TextItem[] = [sorted[0]];
  let currentY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];

    if (Math.abs(item.y - currentY) <= Y_TOLERANCE) {
      // Same row
      currentRow.push(item);
    } else {
      // New row - save current and start new
      if (currentRow.length > 0) {
        rows.push(currentRow.sort((a, b) => a.x - b.x));
      }
      currentRow = [item];
      currentY = item.y;
    }
  }

  // Don't forget the last row
  if (currentRow.length > 0) {
    rows.push(currentRow.sort((a, b) => a.x - b.x));
  }

  return rows;
}

/**
 * Find the most common column count in rows (likely the table structure)
 */
function findTypicalColumnCount(rows: TextItem[][]): number {
  const counts: Record<number, number> = {};
  for (const row of rows) {
    const count = row.length;
    counts[count] = (counts[count] || 0) + 1;
  }

  // Find most common count that's >= MIN_COLUMNS
  let maxCount = 0;
  let typicalCols = 0;
  for (const [cols, count] of Object.entries(counts)) {
    const colNum = parseInt(cols);
    if (colNum >= MIN_COLUMNS && count > maxCount) {
      maxCount = count;
      typicalCols = colNum;
    }
  }

  return typicalCols;
}

/**
 * Detects column boundaries from rows with consistent item count
 */
function detectColumnBoundaries(rows: TextItem[][], typicalCols: number): number[] {
  // Only use rows with the typical column count for detection
  const consistentRows = rows.filter(row => row.length === typicalCols);

  if (consistentRows.length === 0) {
    // Fall back to all rows
    return detectColumnBoundariesFallback(rows);
  }

  // For each column position, collect X values
  const columnXValues: number[][] = Array.from({ length: typicalCols }, () => []);

  for (const row of consistentRows) {
    for (let i = 0; i < row.length; i++) {
      columnXValues[i].push(row[i].x);
    }
  }

  // Calculate median X for each column
  return columnXValues.map(xValues => {
    xValues.sort((a, b) => a - b);
    return xValues[Math.floor(xValues.length / 2)];
  });
}

/**
 * Fallback column detection using clustering
 */
function detectColumnBoundariesFallback(rows: TextItem[][]): number[] {
  const xPositions: number[] = [];

  for (const row of rows) {
    for (const item of row) {
      xPositions.push(item.x);
    }
  }

  if (xPositions.length === 0) return [];

  xPositions.sort((a, b) => a - b);

  const clusters: number[] = [];
  let clusterStart = xPositions[0];
  let clusterSum = xPositions[0];
  let clusterCount = 1;

  for (let i = 1; i < xPositions.length; i++) {
    if (xPositions[i] - clusterStart <= X_TOLERANCE) {
      clusterSum += xPositions[i];
      clusterCount++;
    } else {
      clusters.push(Math.round(clusterSum / clusterCount));
      clusterStart = xPositions[i];
      clusterSum = xPositions[i];
      clusterCount = 1;
    }
  }

  clusters.push(Math.round(clusterSum / clusterCount));

  return clusters;
}

/**
 * Maps a row's items to columns
 */
function mapRowToColumns(row: TextItem[], columnBoundaries: number[]): string[] {
  const result: string[] = new Array(columnBoundaries.length).fill("");

  for (const item of row) {
    let closestCol = 0;
    let closestDist = Math.abs(item.x - columnBoundaries[0]);

    for (let i = 1; i < columnBoundaries.length; i++) {
      const dist = Math.abs(item.x - columnBoundaries[i]);
      if (dist < closestDist) {
        closestDist = dist;
        closestCol = i;
      }
    }

    // Append to existing content (handles multi-part cells)
    if (result[closestCol]) {
      result[closestCol] += " " + item.str;
    } else {
      result[closestCol] = item.str;
    }
  }

  return result;
}

/**
 * Splits rows into separate tables based on Y gaps
 */
function splitIntoTables(rows: TextItem[][]): TextItem[][][] {
  if (rows.length === 0) return [];

  const tables: TextItem[][][] = [];
  let currentTable: TextItem[][] = [rows[0]];

  for (let i = 1; i < rows.length; i++) {
    const prevRowY = Math.min(...rows[i - 1].map((item) => item.y));
    const currRowY = Math.min(...rows[i].map((item) => item.y));
    const gap = currRowY - prevRowY;

    if (gap > TABLE_GAP_THRESHOLD) {
      if (currentTable.length >= MIN_TABLE_ROWS) {
        tables.push(currentTable);
      }
      currentTable = [rows[i]];
    } else {
      currentTable.push(rows[i]);
    }
  }

  if (currentTable.length >= MIN_TABLE_ROWS) {
    tables.push(currentTable);
  }

  return tables;
}

/**
 * Converts rows to structured table data
 */
function rowsToTable(rows: TextItem[][], tableIndex: number): ParsedTable | null {
  if (rows.length < MIN_TABLE_ROWS) return null;

  // Find typical column count
  const typicalCols = findTypicalColumnCount(rows);

  console.log(`Table ${tableIndex}: ${rows.length} rows, typical cols: ${typicalCols}`);

  if (typicalCols < MIN_COLUMNS) return null;

  // Detect column boundaries
  const columnBoundaries = detectColumnBoundaries(rows, typicalCols);

  console.log(`Column boundaries:`, columnBoundaries);

  if (columnBoundaries.length < MIN_COLUMNS) return null;

  // Map all rows to columns
  const mappedRows = rows.map((row) => mapRowToColumns(row, columnBoundaries));

  // Find header row - look for row with text-like content (not just numbers)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(5, mappedRows.length); i++) {
    const row = mappedRows[i];
    const hasTextHeaders = row.slice(1).some(cell =>
      cell && isNaN(Number(cell.replace(/[^\d.-]/g, '')))
    );
    if (hasTextHeaders) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = mappedRows[headerRowIndex];
  const tableRows: TableRow[] = [];

  for (let i = headerRowIndex + 1; i < mappedRows.length; i++) {
    const rowData = mappedRows[i];
    const label = rowData[0]?.trim() || `Row ${i}`;

    // Skip rows with empty labels
    if (!label || label === `Row ${i}`) continue;

    const values: Record<string, string> = {};
    for (let j = 1; j < headers.length; j++) {
      const header = headers[j]?.trim() || `Column ${j}`;
      values[header] = rowData[j]?.trim() || "";
    }

    tableRows.push({
      id: `table-${tableIndex}-row-${i}`,
      label,
      values,
    });
  }

  if (tableRows.length === 0) return null;

  return {
    id: `table-${tableIndex}`,
    headers: headers.slice(1).map(h => h?.trim() || "").filter(h => h),
    rows: tableRows,
  };
}

/**
 * Main function: Detects tables from extracted text items
 */
export function detectTables(items: TextItem[]): ParsedTable[] {
  console.log(`Detecting tables from ${items.length} text items`);

  // Group into rows
  const rows = groupIntoRows(items);
  console.log(`Grouped into ${rows.length} rows`);

  if (rows.length < MIN_TABLE_ROWS) {
    return [];
  }

  // Log sample rows
  console.log("Sample rows:", rows.slice(0, 5).map(r => ({
    itemCount: r.length,
    items: r.map(i => ({ str: i.str.slice(0, 20), x: i.x, y: i.y }))
  })));

  // Split into separate tables if there are large gaps
  const tableGroups = splitIntoTables(rows);
  console.log(`Split into ${tableGroups.length} table groups`);

  // Convert each group to structured table data
  const tables: ParsedTable[] = [];

  for (let i = 0; i < tableGroups.length; i++) {
    const table = rowsToTable(tableGroups[i], i);
    if (table && table.rows.length > 0) {
      tables.push(table);
    }
  }

  return tables;
}

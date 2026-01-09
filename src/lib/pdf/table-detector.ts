import type { TextItem, ParsedTable, TableRow } from "@/types/table";

// Tolerance for grouping items into rows (pixels) - very tight for nutritional PDFs
const Y_TOLERANCE = 2;
// Tolerance for detecting column boundaries (pixels)
const X_TOLERANCE = 8;
// Minimum gap between tables (pixels)
const TABLE_GAP_THRESHOLD = 25;
// Minimum rows to be considered a table
const MIN_TABLE_ROWS = 2;
// Minimum columns for a valid table
const MIN_COLUMNS = 2;
// Maximum reasonable column width (pixels) - helps detect when items should be separate columns
const MAX_COL_WIDTH = 100;

/**
 * Groups text items into rows based on Y position
 * Uses average Y of row for comparison to handle slight variations
 */
function groupIntoRows(items: TextItem[]): TextItem[][] {
  if (items.length === 0) return [];

  // Sort by Y position first
  const sorted = [...items].sort((a, b) => a.y - b.y);

  const rows: TextItem[][] = [];
  let currentRow: TextItem[] = [sorted[0]];

  // Calculate average Y of current row for comparison
  const getRowAvgY = (row: TextItem[]) =>
    row.reduce((sum, item) => sum + item.y, 0) / row.length;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const currentAvgY = getRowAvgY(currentRow);

    if (Math.abs(item.y - currentAvgY) <= Y_TOLERANCE) {
      // Same row
      currentRow.push(item);
    } else {
      // New row - save current and start new
      if (currentRow.length > 0) {
        rows.push(currentRow.sort((a, b) => a.x - b.x));
      }
      currentRow = [item];
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
 * Fallback column detection using gap analysis
 * Looks for significant gaps between items to determine column boundaries
 */
function detectColumnBoundariesFallback(rows: TextItem[][]): number[] {
  // Collect all unique X positions with their frequencies
  const xPositionCounts: Map<number, number> = new Map();

  for (const row of rows) {
    for (const item of row) {
      // Round to nearest 5 pixels for grouping
      const roundedX = Math.round(item.x / 5) * 5;
      xPositionCounts.set(roundedX, (xPositionCounts.get(roundedX) || 0) + 1);
    }
  }

  if (xPositionCounts.size === 0) return [];

  // Sort positions and find clusters
  const positions = Array.from(xPositionCounts.keys()).sort((a, b) => a - b);

  const clusters: number[] = [];
  let clusterPositions: number[] = [positions[0]];

  for (let i = 1; i < positions.length; i++) {
    const gap = positions[i] - positions[i - 1];

    if (gap <= X_TOLERANCE * 2) {
      // Same cluster
      clusterPositions.push(positions[i]);
    } else {
      // New cluster - save previous
      const avgPos = clusterPositions.reduce((a, b) => a + b, 0) / clusterPositions.length;
      clusters.push(Math.round(avgPos));
      clusterPositions = [positions[i]];
    }
  }

  // Don't forget last cluster
  if (clusterPositions.length > 0) {
    const avgPos = clusterPositions.reduce((a, b) => a + b, 0) / clusterPositions.length;
    clusters.push(Math.round(avgPos));
  }

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
 * Finds the best header row index based on content analysis
 */
function findHeaderRowIndex(mappedRows: string[][]): number {
  // Look for first row where most cells contain text (not just numbers)
  for (let i = 0; i < Math.min(5, mappedRows.length); i++) {
    const row = mappedRows[i];
    let textCells = 0;
    let totalCells = 0;

    for (let j = 1; j < row.length; j++) {
      const cell = row[j]?.trim();
      if (cell) {
        totalCells++;
        // Check if cell is primarily text (not a number)
        const cleaned = cell.replace(/[,\s%$]/g, "");
        if (isNaN(Number(cleaned)) && !/^\d+\.?\d*$/.test(cleaned)) {
          textCells++;
        }
      }
    }

    // If more than half the cells are text, this is likely a header row
    if (totalCells > 0 && textCells / totalCells > 0.5) {
      return i;
    }
  }

  return 0;
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

  console.log(`Column boundaries (${columnBoundaries.length}):`, columnBoundaries.slice(0, 10));

  if (columnBoundaries.length < MIN_COLUMNS) return null;

  // Map all rows to columns
  const mappedRows = rows.map((row) => mapRowToColumns(row, columnBoundaries));

  // Log mapped rows for debugging
  console.log("Sample mapped rows:", mappedRows.slice(0, 3).map((r, i) => ({
    idx: i,
    cells: r.slice(0, 5).map(c => c?.slice(0, 20))
  })));

  // Find header row
  const headerRowIndex = findHeaderRowIndex(mappedRows);
  console.log(`Using header row index: ${headerRowIndex}`);

  const headers = mappedRows[headerRowIndex];
  const tableRows: TableRow[] = [];

  // Process data rows
  for (let i = headerRowIndex + 1; i < mappedRows.length; i++) {
    const rowData = mappedRows[i];
    const label = rowData[0]?.trim();

    // Skip rows with empty or very short labels (likely continuation or noise)
    if (!label || label.length < 2) continue;

    // Skip rows that look like sub-headers or section headers
    const firstDataCell = rowData[1]?.trim();
    if (firstDataCell && isNaN(Number(firstDataCell.replace(/[,\s%$]/g, "")))) {
      // If first data cell is also text, this might be a sub-header - skip
      const numericCells = rowData.slice(1).filter(cell => {
        const cleaned = cell?.trim().replace(/[,\s%$]/g, "");
        return cleaned && !isNaN(Number(cleaned));
      }).length;

      if (numericCells < rowData.length / 3) {
        continue; // Skip non-data rows
      }
    }

    const values: Record<string, string> = {};
    for (let j = 1; j < Math.min(headers.length, rowData.length); j++) {
      const header = headers[j]?.trim() || `Column ${j}`;
      if (header && header !== `Column ${j}`) {
        values[header] = rowData[j]?.trim() || "";
      }
    }

    // Only add row if it has values
    if (Object.keys(values).length > 0) {
      tableRows.push({
        id: `table-${tableIndex}-row-${i}`,
        label,
        values,
      });
    }
  }

  if (tableRows.length === 0) return null;

  // Filter out empty headers
  const validHeaders = headers.slice(1)
    .map(h => h?.trim() || "")
    .filter(h => h && h.length > 0);

  console.log(`Table ${tableIndex}: ${validHeaders.length} headers, ${tableRows.length} rows`);

  return {
    id: `table-${tableIndex}`,
    headers: validHeaders,
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

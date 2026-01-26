import type { TextItem } from "@/types/table";

// Keywords that suggest a text item is a column header
export const HEADER_KEYWORDS = [
  "calorie", "fat", "sodium", "carb", "protein", "sugar", "fiber",
  "serving", "weight", "cholesterol", "vitamin", "calcium", "iron"
];

// Section headers to exclude from row items
export const SECTION_KEYWORDS = [
  "toppings", "appetizers", "wings", "salads", "dressings", "wraps",
  "pastas", "meat", "chicken", "veggie", "cheese", "desserts", "beverages",
  "kids", "pizzas", "nutrition facts", "daily value"
];

export interface HeaderItem {
  text: string;
  item: TextItem;
}

export interface RowItem {
  text: string;
  item: TextItem;
  section?: string;
}

/**
 * Find likely column headers from extracted text items
 */
export function findHeaders(items: TextItem[]): HeaderItem[] {
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

/**
 * Find likely row items (menu items, not section headers)
 */
export function findRowItems(items: TextItem[], headerY: number): RowItem[] {
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

/**
 * Find cell value at intersection of header column and row
 */
export function findCellValue(
  items: TextItem[],
  headerItem: TextItem,
  rowItem: TextItem,
  xTolerance: number = 40,
  yTolerance: number = 15
): string | null {
  // Look for items near the intersection
  const candidates = items.filter(item => {
    const xDiff = Math.abs(item.x - headerItem.x);
    const yDiff = Math.abs(item.y - rowItem.y);
    return xDiff < xTolerance && yDiff < yTolerance && item.str.trim().length > 0;
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

/**
 * Get all values for a row
 */
export function getAllRowValues(
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

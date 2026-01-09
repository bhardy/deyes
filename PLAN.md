# Table Reader App - Implementation Plan

## Overview

An app that makes health information tables (and other data tables) easy to read on mobile devices. Users can input a PDF URL, and the app parses the table data, allowing them to:

1. Query specific cell values (e.g., "What are the carbohydrates for cheese lovers pizza?")
2. View full rows in a mobile-friendly format

---

## Input Sources (Priority Order)

| Phase | Input Type | Status |
|-------|------------|--------|
| 1 | PDF via URL | 🎯 First implementation |
| 2 | PDF upload | Next |
| 3 | Webpage URL with table | Future |
| 4 | Image upload | Future |

---

## Technical Architecture

### PDF Parsing Service

**Recommended: LlamaParse (via LlamaCloud)**
- ✅ Free tier: 1,000 pages/day (more than enough for low traffic)
- ✅ Excellent table extraction
- ✅ Returns structured markdown tables
- ✅ Works with Vercel serverless functions
- ✅ Simple API integration

**Alternative Options:**
- Unstructured.io (free tier available, good table support)
- pdf-parse + manual table extraction (free, but less reliable)

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  API Route  │────▶│ LlamaParse  │
│  (URL input)│     │ /api/parse  │     │   Service   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Return    │
                    │ Table Data  │
                    │   (JSON)    │
                    └─────────────┘
```

### Table Data Structure

```typescript
interface ParsedTable {
  id: string;
  name?: string;           // Optional table title if detected
  headers: string[];       // Column headers
  rows: TableRow[];
}

interface TableRow {
  id: string;
  label: string;           // First column (row identifier)
  values: Record<string, string>;  // Column header → value mapping
}

interface ParseResult {
  sourceUrl: string;
  tables: ParsedTable[];
  parsedAt: string;
}
```

---

## UI/UX Flow

### Screen 1: Input Screen (Home)

Current state expanded. User enters a PDF URL.

```
┌────────────────────────────┐
│  [Theme Toggle]            │
│                            │
│         deyes              │
│                            │
│  ┌──────────────────────┐  │
│  │ Paste PDF URL...     │  │
│  └──────────────────────┘  │
│                            │
│  [ Future: Upload PDF ]    │
│                            │
└────────────────────────────┘
```

**Components needed:**
- Input field (already exists)
- Submit/parse button
- File upload zone (Phase 2)

### Screen 2: Loading Screen

Show while PDF is being fetched and parsed.

```
┌────────────────────────────┐
│                            │
│      ┌─────────────┐       │
│      │  Spinning   │       │
│      │   Loader    │       │
│      └─────────────┘       │
│                            │
│    Parsing PDF...          │
│    (nutritionals.pdf)      │
│                            │
└────────────────────────────┘
```

**Components needed:**
- Loading spinner component
- Status message

### Screen 3: Table Selection (if multiple tables)

Only shown if PDF contains multiple tables.

```
┌────────────────────────────┐
│  [← Back]   [Theme Toggle] │
│                            │
│   Found 3 tables           │
│                            │
│  ┌──────────────────────┐  │
│  │ Nutrition - Pizza    │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ Nutrition - Sides    │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ Nutrition - Drinks   │  │
│  └──────────────────────┘  │
│                            │
└────────────────────────────┘
```

**Components needed:**
- Table selection list
- Back navigation

### Screen 4: Query Interface

Main interaction screen. Two select inputs for column and row.

```
┌────────────────────────────┐
│  [← Back]   [Theme Toggle] │
│                            │
│   What do you want to      │
│   know?                    │
│                            │
│  Column (Nutrient):        │
│  ┌──────────────────────┐  │
│  │ Carbohydrates      ▼ │  │
│  └──────────────────────┘  │
│                            │
│  Row (Item):               │
│  ┌──────────────────────┐  │
│  │ Cheese Lovers (Slice)▼│  │
│  └──────────────────────┘  │
│                            │
│        [ Look Up ]         │
│                            │
└────────────────────────────┘
```

**Components needed:**
- Select component (shadcn/ui)
- Labels
- Submit button

### Screen 5: Result Display

Shows the queried value prominently, with option to view full row.

```
┌────────────────────────────┐
│  [← Back]   [Theme Toggle] │
│                            │
│   Cheese Lovers (Slice)    │
│   Carbohydrates            │
│                            │
│  ┌──────────────────────┐  │
│  │                      │  │
│  │        36g           │  │
│  │                      │  │
│  └──────────────────────┘  │
│                            │
│   [ View Full Details ]    │
│                            │
│   [ New Query ]            │
│                            │
└────────────────────────────┘
```

### Screen 6: Full Row View

Mobile-friendly 2-column grid showing all values for the selected row.

```
┌────────────────────────────┐
│  [← Back]   [Theme Toggle] │
│                            │
│   Cheese Lovers (Slice)    │
│                            │
│  ┌──────────────────────┐  │
│  │ Calories     │  290  │  │
│  ├──────────────┼───────┤  │
│  │ Total Fat    │  13g  │  │
│  ├──────────────┼───────┤  │
│  │ Carbs        │  36g  │  │
│  ├──────────────┼───────┤  │
│  │ Protein      │  12g  │  │
│  ├──────────────┼───────┤  │
│  │ Sodium       │ 650mg │  │
│  └──────────────┴───────┘  │
│                            │
│   [ New Query ]            │
│                            │
└────────────────────────────┘
```

**Components needed:**
- Data grid/table component (2-column layout)
- Row item styling

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── parse/
│   │       └── route.ts          # PDF parsing endpoint
│   ├── layout.tsx
│   ├── page.tsx                  # Home (URL input)
│   └── table/
│       └── page.tsx              # Table interaction (query + results)
├── components/
│   ├── home-content.tsx          # Update for PDF URL input
│   ├── table/
│   │   ├── loading-screen.tsx    # Parsing loading state
│   │   ├── table-selector.tsx    # Multi-table selection
│   │   ├── query-form.tsx        # Column/row selects
│   │   ├── result-display.tsx    # Single value display
│   │   └── row-details.tsx       # Full row 2-column view
│   ├── theme-toggle.tsx
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── select.tsx            # Add shadcn select
│       └── spinner.tsx           # Add loading spinner
├── lib/
│   ├── utils.ts
│   ├── parse-pdf.ts              # LlamaParse integration
│   └── table-utils.ts            # Table parsing helpers
└── types/
    └── table.ts                  # Type definitions
```

---

## Implementation Phases

### Phase 1: Core PDF URL Parsing (MVP)

**Tasks:**
1. Set up LlamaParse API integration
2. Create `/api/parse` endpoint
3. Update home page for URL input with submit
4. Create loading screen component
5. Create query form with selects
6. Create result display component
7. Create row details view
8. Add shadcn Select component
9. Add state management for parsed table data

**Environment Variables:**
```env
LLAMA_CLOUD_API_KEY=your_key_here
```

### Phase 2: PDF Upload

**Tasks:**
1. Add file upload zone to home page
2. Update API to handle file uploads
3. Add file size/type validation

### Phase 3: Webpage Tables (Future)

**Tasks:**
1. Add URL input option for webpages
2. Create web scraping endpoint
3. Parse HTML tables to same format

### Phase 4: Image Upload (Future)

**Tasks:**
1. Add image upload support
2. Integrate OCR service (e.g., Google Vision, Tesseract)
3. Table detection from images

---

## State Management

Use React state + URL search params for shareable states.

```typescript
// URL structure for shareable queries
/table?url=<encoded_pdf_url>&table=0&row=<row_id>&col=<column_name>

// Client state
interface AppState {
  sourceUrl: string | null;
  isLoading: boolean;
  error: string | null;
  parseResult: ParseResult | null;
  selectedTableIndex: number;
  selectedRowId: string | null;
  selectedColumn: string | null;
  view: 'input' | 'loading' | 'select-table' | 'query' | 'result' | 'row-details';
}
```

---

## Error Handling

| Error Type | User Message |
|------------|--------------|
| Invalid URL | "Please enter a valid PDF URL" |
| Fetch failed | "Couldn't access this PDF. Make sure the URL is public." |
| Parse failed | "Couldn't read tables from this PDF. Try a different file." |
| No tables found | "No tables found in this PDF." |
| Rate limited | "Too many requests. Please try again later." |

---

## Performance Considerations

1. **Caching**: Cache parsed results in memory or Redis (Vercel KV has free tier) to avoid re-parsing same URLs
2. **Timeout**: Set reasonable timeout for PDF parsing (30s max)
3. **Size limits**: Limit PDF size to prevent memory issues (10MB max)
4. **Lazy loading**: Only load table data when needed

---

## Accessibility

1. Proper ARIA labels on selects
2. Keyboard navigation support
3. Screen reader friendly result announcements
4. High contrast in result display
5. Focus management between screens

---

## Testing Strategy

**Example PDF for testing:**
- URL: `https://assets.ctfassets.net/foi9ggpj1j8o/7rP6F2kWHOSs5DTlolMoeM/1473cdd8784a6ff7ae8eccf56fe52e04/nutritionals.14841ea6d15764c94dd896afffdb2452.pdf`
- Expected: Nutritional information table for pizza items
- Test query: Carbohydrates for Cheese Lovers slice

**Alternative test PDFs:**
- Find public nutritional PDFs from restaurant chains
- Create test PDF with known table structure

---

## Open Questions

1. **Multiple tables in one PDF**: Should we auto-merge similar tables or keep them separate?
2. **Unit handling**: Should we parse and standardize units (g, mg, kcal)?
3. **Search**: Should we add fuzzy search for row/column names?
4. **History**: Should we save recent queries locally?
5. **Sharing**: Should users be able to share a specific query result?

---

## Next Steps

1. [ ] Set up LlamaParse account and get API key
2. [ ] Create type definitions (`src/types/table.ts`)
3. [ ] Implement API route (`/api/parse`)
4. [ ] Add shadcn Select component
5. [ ] Build out UI screens progressively
6. [ ] Test with example PDF
7. [ ] Add error handling
8. [ ] Polish animations with Motion

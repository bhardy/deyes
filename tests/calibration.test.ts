import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { TextItem } from '@/types/table';
import { findHeaders, findRowItems, findCellValue, getAllRowValues } from '@/lib/pdf/calibration';

// We need to parse the PDF to get text items
// Using pdfjs-dist in Node.js environment
async function parsePdfToTextItems(pdfPath: string): Promise<TextItem[]> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const data = fs.readFileSync(pdfPath);
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;

  const allItems: TextItem[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    for (const item of textContent.items) {
      if (!('str' in item) || !(item as any).str.trim()) continue;

      const textItem = item as any;
      const [, , , , tx, ty] = textItem.transform;

      allItems.push({
        str: textItem.str,
        x: Math.round(tx * 100) / 100,
        y: Math.round((viewport.height - ty) * 100) / 100,
        width: Math.round(textItem.width * 100) / 100,
        height: Math.round(textItem.height * 100) / 100,
      });
    }
  }

  return allItems;
}

describe('Pizza Hut PDF Calibration', () => {
  let textItems: TextItem[] = [];
  const pdfPath = path.join(__dirname, 'pdfs/pizza-hut-nutrition.pdf');

  beforeAll(async () => {
    textItems = await parsePdfToTextItems(pdfPath);
    console.log(`Parsed ${textItems.length} text items from PDF`);
  });

  describe('Header Detection', () => {
    it('should find Calories header', () => {
      const headers = findHeaders(textItems);
      const caloriesHeader = headers.find(h => h.text.toLowerCase().includes('calories'));
      expect(caloriesHeader).toBeDefined();
      console.log('Calories header:', caloriesHeader?.text, 'at position:', caloriesHeader?.item.x, caloriesHeader?.item.y);
    });

    it('should find Serving Size header', () => {
      const headers = findHeaders(textItems);
      const servingSizeHeader = headers.find(h => h.text.toLowerCase().includes('serving'));
      expect(servingSizeHeader).toBeDefined();
      console.log('Serving Size header:', servingSizeHeader?.text, 'at position:', servingSizeHeader?.item.x, servingSizeHeader?.item.y);
    });

    it('should find Sodium header', () => {
      const headers = findHeaders(textItems);
      const sodiumHeader = headers.find(h => h.text.toLowerCase().includes('sodium'));
      expect(sodiumHeader).toBeDefined();
      console.log('Sodium header:', sodiumHeader?.text, 'at position:', sodiumHeader?.item.x, sodiumHeader?.item.y);
    });

    it('should find expected nutrition headers', () => {
      const headers = findHeaders(textItems);
      const headerTexts = headers.map(h => h.text);
      console.log('All detected headers:', headerTexts);

      // Expected headers from the PDF
      const expectedKeywords = ['serving', 'weight', 'calories', 'fat', 'sodium', 'carb', 'fiber', 'sugar', 'protein'];

      for (const keyword of expectedKeywords) {
        const found = headerTexts.some(h => h.toLowerCase().includes(keyword));
        expect(found, `Should find header containing "${keyword}"`).toBe(true);
      }
    });
  });

  describe('Row Item Detection', () => {
    it('should find Mozzarella Cheese PPP', () => {
      const headers = findHeaders(textItems);
      const minHeaderY = Math.min(...headers.map(h => h.item.y));
      const rows = findRowItems(textItems, minHeaderY);

      const mozzarellaPPP = rows.find(r => r.text.includes('Mozzarella Cheese PPP'));
      expect(mozzarellaPPP).toBeDefined();
      console.log('Mozzarella Cheese PPP:', mozzarellaPPP?.text, 'section:', mozzarellaPPP?.section);
    });

    it('should find menu items with Toppings section', () => {
      const headers = findHeaders(textItems);
      const minHeaderY = Math.min(...headers.map(h => h.item.y));
      const rows = findRowItems(textItems, minHeaderY);

      const toppingsItems = rows.filter(r => r.section?.toLowerCase().includes('toppings'));
      console.log('Items in Toppings section:', toppingsItems.slice(0, 5).map(r => r.text));

      expect(toppingsItems.length).toBeGreaterThan(0);
    });

    it('should find various menu items', () => {
      const headers = findHeaders(textItems);
      const minHeaderY = Math.min(...headers.map(h => h.item.y));
      const rows = findRowItems(textItems, minHeaderY);

      console.log(`Found ${rows.length} row items`);
      console.log('First 10 rows:', rows.slice(0, 10).map(r => ({ text: r.text, section: r.section })));

      expect(rows.length).toBeGreaterThan(10);
    });
  });

  describe('Cell Value Lookup', () => {
    it('should find Calories value for Mozzarella Cheese PPP', () => {
      const headers = findHeaders(textItems);
      const minHeaderY = Math.min(...headers.map(h => h.item.y));
      const rows = findRowItems(textItems, minHeaderY);

      const caloriesHeader = headers.find(h => h.text.toLowerCase().includes('calories'));
      const mozzarellaPPP = rows.find(r => r.text.includes('Mozzarella Cheese PPP'));

      expect(caloriesHeader).toBeDefined();
      expect(mozzarellaPPP).toBeDefined();

      if (caloriesHeader && mozzarellaPPP) {
        const value = findCellValue(textItems, caloriesHeader.item, mozzarellaPPP.item);
        console.log('Mozzarella Cheese PPP Calories:', value);

        // From the PDF: Mozzarella Cheese PPP has 60 calories
        expect(value).toBe('60');
      }
    });

    it('should find Weight value for Mozzarella Cheese PPP', () => {
      const headers = findHeaders(textItems);
      const minHeaderY = Math.min(...headers.map(h => h.item.y));
      const rows = findRowItems(textItems, minHeaderY);

      const weightHeader = headers.find(h => h.text.toLowerCase().includes('weight'));
      const mozzarellaPPP = rows.find(r => r.text.includes('Mozzarella Cheese PPP'));

      expect(weightHeader).toBeDefined();
      expect(mozzarellaPPP).toBeDefined();

      if (weightHeader && mozzarellaPPP) {
        const value = findCellValue(textItems, weightHeader.item, mozzarellaPPP.item);
        console.log('Mozzarella Cheese PPP Weight:', value);

        // From the PDF: Mozzarella Cheese PPP has weight 20g
        expect(value).toBe('20');
      }
    });

    it('should get all values for Mozzarella Cheese PPP', () => {
      const headers = findHeaders(textItems);
      const minHeaderY = Math.min(...headers.map(h => h.item.y));
      const rows = findRowItems(textItems, minHeaderY);

      const mozzarellaPPP = rows.find(r => r.text.includes('Mozzarella Cheese PPP'));

      expect(mozzarellaPPP).toBeDefined();

      if (mozzarellaPPP) {
        const values = getAllRowValues(textItems, headers, mozzarellaPPP.item);
        console.log('Mozzarella Cheese PPP all values:', values);

        // Verify some known values from the PDF
        // Mozzarella Cheese PPP: Serving Size=Per 1 Pizza, Weight=20, Calories=60, Total Fat=4
        expect(values['Calories']).toBe('60');
      }
    });

    it('should find Calories for Bacon PPP', () => {
      const headers = findHeaders(textItems);
      const minHeaderY = Math.min(...headers.map(h => h.item.y));
      const rows = findRowItems(textItems, minHeaderY);

      const caloriesHeader = headers.find(h => h.text.toLowerCase().includes('calories'));
      const baconPPP = rows.find(r => r.text.includes('Bacon PPP'));

      console.log('Looking for Bacon PPP...');
      console.log('Bacon items found:', rows.filter(r => r.text.toLowerCase().includes('bacon')).map(r => r.text));

      if (caloriesHeader && baconPPP) {
        const value = findCellValue(textItems, caloriesHeader.item, baconPPP.item);
        console.log('Bacon PPP Calories:', value);

        // From the PDF: Bacon PPP has 60 calories
        expect(value).toBe('60');
      }
    });
  });

  describe('Debug: Raw Text Items', () => {
    it('should log sample text items for debugging', () => {
      // Log items that contain "Calories" or "calories"
      const calorieItems = textItems.filter(item =>
        item.str.toLowerCase().includes('calorie')
      );
      console.log('\nItems containing "calorie":');
      calorieItems.forEach(item => {
        console.log(`  "${item.str}" at (${item.x}, ${item.y})`);
      });

      // Log items that contain "Mozzarella"
      const mozzarellaItems = textItems.filter(item =>
        item.str.toLowerCase().includes('mozzarella')
      );
      console.log('\nItems containing "mozzarella":');
      mozzarellaItems.forEach(item => {
        console.log(`  "${item.str}" at (${item.x}, ${item.y})`);
      });

      // Log items with "60" that might be the calories value
      const sixtyItems = textItems.filter(item =>
        item.str.trim() === '60'
      ).slice(0, 10);
      console.log('\nItems with value "60" (first 10):');
      sixtyItems.forEach(item => {
        console.log(`  "${item.str}" at (${item.x}, ${item.y})`);
      });
    });
  });
});

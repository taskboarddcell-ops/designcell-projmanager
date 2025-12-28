# AI Reporting Module

This module generates professional PDF/HTML reports for project status using Supabase data and Gemini AI insights.

## Prerequisites

1.  **Environment Variables**:
    *   `NEXT_PUBLIC_SUPABASE_URL`
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   `GEMINI_API_KEY`: API Key for Google Gemini (Flash model).

2.  **Dependencies**:
    For PDF generation, you must install Puppeteer:
    ```bash
    npm install puppeteer
    # OR
    yarn add puppeteer
    ```
    *Note: The code dynamically imports puppeteer, so the HTML generation works without it, but `outputFormat: 'pdf'` will fail.*

## Usage

```typescript
import { generateReport } from './app/reporting';

async function run() {
  const pdfBuffer = await generateReport({
    reportType: 'weekly',
    startDate: '2023-12-01',
    endDate: '2023-12-07',
    orgId: 'my-org'
  }, 'pdf');
  
  // Save or Serve pdfBuffer
}
```

## Architecture

*   **`dal.ts`**: Fetches raw data (Tasks, Logs, Profiles).
*   **`analytics.ts`**: Helper functions to calculate Cycle Time, Aging, Throughput.
*   **`gemini.ts`**: Sends metrics to Gemini 1.5/2.0 Flash to generate textual insights.
*   **`htmlTemplate.ts`**: Renders the report into a responsive HTML layout with embedded Chart.js scripts.
*   **`pdf.ts`**: Uses Puppeteer to print the HTML to PDF.

## Charting
Charts are rendered client-side (in the headless browser) using Chart.js. This ensures high-quality vectors in the PDF output.

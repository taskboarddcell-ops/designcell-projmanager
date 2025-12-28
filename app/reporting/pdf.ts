/**
 * Generate PDF from HTML using Puppeteer
 */
export async function generatePdf(html: string): Promise<Buffer> {
    try {
        // Dynamic import to avoid build errors if puppeteer not installed
        const puppeteer = await import('puppeteer');

        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        // Set content and wait for charts to render
        await page.setContent(html, {
            waitUntil: ['networkidle0', 'domcontentloaded']
        });


        // Wait for Chart.js to render
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Generate PDF with print settings
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            },
            preferCSSPageSize: true
        });

        await browser.close();

        return Buffer.from(pdfBuffer);

    } catch (error) {
        console.error('PDF generation error:', error);
        throw new Error(
            'PDF generation failed. Ensure puppeteer is installed: npm install puppeteer'
        );
    }
}

import path from "path";
import fs from "fs";
import { globby } from "globby";
import PDFMerger from "pdf-merger-js";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async function generateDocumentationPDF() {
  const mdxFiles = await globby(["pages/**/*.mdx"]);
  const routes = mdxFiles.map((file) => {
    let route = file
      .replace(/^pages/, "") // if you're using `pages` now instead of `docs`
      .replace(/\\/g, "/") // Windows path fix
      .replace(/\/index\.mdx$/, "/")
      .replace(/\.mdx$/, "");
    return route.startsWith("/") ? route : `/${route}`;
  });

  // 3. Launch Puppeteer
  const browser = await puppeteer.launch({
    executablePath:
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  // 4. Prepare PDF merger
  const merger = new PDFMerger();
  const tempDir = path.join(__dirname, "pdfs");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  // 5. Print each route to PDF and add to merger
  for (const route of routes) {
    const url = `http://localhost:3000${route}`;
    console.log(`Rendering ${url} → PDF`);
    await page.goto(url, { waitUntil: "networkidle0" });

    const sanitized =
      route === "/" ? "home" : route.slice(1).replace(/\//g, "_");
    const pdfPath = path.join(tempDir, `${sanitized}.pdf`);

    await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
    merger.add(pdfPath);
  }

  // 6. Merge all PDFs into one document
  const outputPath = path.join(__dirname, "..", "documentation.pdf");
  await merger.save(outputPath);

  console.log(`✅ documentation.pdf generated at ${outputPath}`);

  // 7. Cleanup: close browser and stop server
  await browser.close();
  server.stop();
})();

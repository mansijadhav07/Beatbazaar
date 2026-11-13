import "server-only";
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { IOrderItemSnapshot } from "@/server/db/models/Order";
import { siteConfig } from "@/config/site";

/**
 * Generates a signed license agreement PDF for a purchased beat order item.
 * Uses pdf-lib with fontkit. Handles non-Latin glyphs and unsupported characters
 * safely without throwing.
 */
export async function generateLicensePdf(
  orderId: string,
  itemIdx: number,
  item: IOrderItemSnapshot,
  buyerName: string,
  orderDate: Date
): Promise<Buffer> {
  const doc = await PDFDocument.create();

  // Attempt custom font loading with fontkit for Unicode/rupee support
  let customFontLoaded = false;
  let font: any;

  try {
    const fontPath = path.join(process.cwd(), "worker/assets/NotoSans-Regular.ttf");
    if (fs.existsSync(fontPath)) {
      doc.registerFontkit(fontkit);
      const fontBytes = fs.readFileSync(fontPath);
      font = await doc.embedFont(fontBytes);
      customFontLoaded = true;
    }
  } catch (err) {
    console.warn("[PDF Generator] Failed to load NotoSans font, using Helvetica fallback:", err);
  }

  if (!customFontLoaded) {
    font = await doc.embedFont(StandardFonts.Helvetica);
  }

  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  // Helper to safely sanitize text if standard font cannot render non-ASCII glyphs
  const safeText = (input: string): string => {
    if (customFontLoaded) return input;
    // Replace rupee sign and normalize to ASCII printable range
    return input
      .replace(/₹/g, "INR ")
      .replace(/[^\x20-\x7E\n]/g, "");
  };

  const page = doc.addPage([595.28, 841.89]); // A4 format in points
  const { height, width } = page.getSize();
  const margin = 50;
  let cursorY = height - margin;

  // Header Title
  page.drawText(safeText(siteConfig.name.toUpperCase()), {
    x: margin,
    y: cursorY,
    size: 20,
    font: boldFont,
    color: rgb(0.17, 0.22, 0.28), // ink color
  });
  cursorY -= 25;

  page.drawText("MUSIC PRODUCTION LICENSE AGREEMENT", {
    x: margin,
    y: cursorY,
    size: 14,
    font: boldFont,
    color: rgb(0.33, 0.48, 0.58), // steel color
  });
  cursorY -= 30;

  // Legal Notice Banner
  page.drawRectangle({
    x: margin,
    y: cursorY - 35,
    width: width - margin * 2,
    height: 40,
    color: rgb(0.98, 0.96, 0.92), // warm notice bg
    borderColor: rgb(0.76, 0.65, 0.43), // brass border
    borderWidth: 1,
  });

  page.drawText("[LEGAL REVIEW REQUIRED]", {
    x: margin + 12,
    y: cursorY - 14,
    size: 9,
    font: boldFont,
    color: rgb(0.56, 0.37, 0.14),
  });

  page.drawText("This agreement contains placeholder terms and must be finalized by legal counsel prior to commercial reliance.", {
    x: margin + 12,
    y: cursorY - 26,
    size: 8,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  cursorY -= 55;

  // Agreement Metadata Table
  const drawRow = (label: string, value: string) => {
    page.drawText(label, {
      x: margin,
      y: cursorY,
      size: 10,
      font: boldFont,
      color: rgb(0.17, 0.22, 0.28),
    });
    page.drawText(safeText(value), {
      x: margin + 150,
      y: cursorY,
      size: 10,
      font,
      color: rgb(0.17, 0.22, 0.28),
    });
    cursorY -= 18;
  };

  drawRow("Order ID:", orderId);
  drawRow("Issue Date:", orderDate.toISOString().split("T")[0]);
  drawRow("Licensee (Buyer):", buyerName || "Verified Buyer");
  drawRow("Licensor (Producer):", item.producerName || "Beatbazaar Producer");
  drawRow("Composition Title:", item.title);
  drawRow("License Tier:", item.licenseTier.toUpperCase());
  drawRow(
    "Fee Paid:",
    `${item.pricePaid.currency} ${(item.pricePaid.amount / 100).toFixed(2)}`
  );
  drawRow("Terms Version:", item.termsVersion || "0.1-placeholder");
  cursorY -= 20;

  // Divider line
  page.drawLine({
    start: { x: margin, y: cursorY },
    end: { x: width - margin, y: cursorY },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.9),
  });
  cursorY -= 25;

  // Terms and Conditions Section
  page.drawText("TERMS AND CONDITIONS", {
    x: margin,
    y: cursorY,
    size: 12,
    font: boldFont,
    color: rgb(0.17, 0.22, 0.28),
  });
  cursorY -= 20;

  const termsParagraphs = [
    `1. GRANT OF LICENSE: Subject to the full payment of the license fee, Licensor hereby grants to Licensee a non-exclusive (or exclusive, as indicated above) commercial license to incorporate the audio recording ("Beat") into one new derivative work.`,
    `2. USAGE RIGHTS AND LIMITATIONS: Licensee is permitted commercial distribution within the limits specified for the ${item.licenseTier} tier. Broadcast rights, streaming thresholds, and synchronization terms apply in accordance with standard marketplace guidelines.`,
    `3. CREDITS AND ATTRIBUTION: Licensee agrees to credit the Licensor as producer on all published and distributed copies (e.g. "Produced by ${item.producerName || "Producer"}").`,
    `4. EXCLUSIVITY: If exclusive rights are indicated, Licensor confirms that the Beat will not be sold to any subsequent parties following the completion of this order.`,
    `5. GOVERNING LAW AND DISCLAIMER: Beatbazaar acts strictly as a marketplace intermediary and is not liable for copyright disputes or representations made by the parties. This agreement is governed by the laws of India.`,
  ];

  for (const paragraph of termsParagraphs) {
    // Basic word wrap
    const words = paragraph.split(" ");
    let line = "";
    for (const word of words) {
      const testLine = line + (line ? " " : "") + word;
      if (testLine.length > 80) {
        page.drawText(safeText(line), {
          x: margin,
          y: cursorY,
          size: 8.5,
          font,
          color: rgb(0.25, 0.3, 0.35),
        });
        cursorY -= 13;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(safeText(line), {
        x: margin,
        y: cursorY,
        size: 8.5,
        font,
        color: rgb(0.25, 0.3, 0.35),
      });
      cursorY -= 18;
    }
  }

  // Footer
  page.drawText(`Generated electronically by ${siteConfig.name} - Verification: ${orderId}-${itemIdx}`, {
    x: margin,
    y: margin,
    size: 7.5,
    font,
    color: rgb(0.6, 0.65, 0.7),
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}


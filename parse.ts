import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Polyfill Promise.withResolvers for Node.js < 22
if (typeof Promise.withResolvers === "undefined") {
  (Promise as any).withResolvers = function () {
    let resolve!: (value: any) => void, reject!: (reason?: any) => void;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}

import * as pdfjsLib from "pdfjs-dist";

const __dirname = dirname(fileURLToPath(import.meta.url));

pdfjsLib.GlobalWorkerOptions.workerSrc = resolve(
  __dirname,
  "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
);

import { extractTextBlocksFromPage } from "../spend_board/frontend/src/utils/pdf/extractTextBlocks.js";
import { groupTextLines } from "../spend_board/frontend/src/utils/pdf/groupTextLines.js";
import { detectBank } from "../spend_board/frontend/src/utils/parsers/bankDetector.js";
import { parseRbcTransactions } from "../spend_board/frontend/src/utils/parsers/rbcStatementParser.js";
import { parseStatementPeriod } from "../spend_board/frontend/src/utils/parsers/rbcStatementPeriodParser.js";

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("Usage: npx tsx parse.ts <pdf_path>");
    process.exit(1);
  }

  const buffer = readFileSync(resolve(pdfPath));
  const pdfDoc = await pdfjsLib
    .getDocument({ data: new Uint8Array(buffer) })
    .promise;

  // Extract text from page 1 for bank detection
  const page1Blocks = await extractTextBlocksFromPage(pdfDoc, 1, 1.0);
  const page1Lines = groupTextLines(page1Blocks);
  const bank = detectBank(page1Lines.map((l) => l.text));

  if (bank !== "rbc") {
    console.error(`Unsupported bank: ${bank}`);
    process.exit(1);
  }

  // Parse all pages
  const allTransactions: any[] = [];
  const allRawLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const blocks = await extractTextBlocksFromPage(pdfDoc, pageNum, 1.0);
    const lines = groupTextLines(blocks);
    allRawLines.push(...lines.map((l) => l.text));
    const pageTx = parseRbcTransactions(lines);
    allTransactions.push(...pageTx);
  }

  // Parse statement period
  const statementPeriod = parseStatementPeriod(allRawLines);

  // Output JSON
  console.log(
    JSON.stringify({
      bank,
      statementPeriod,
      transactions: allTransactions,
    })
  );

  await pdfDoc.destroy();
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});

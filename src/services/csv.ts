/**
 * Minimal RFC 4180 CSV writer.
 *
 * Excel on Windows only auto-detects UTF-8 when the file starts with a BOM,
 * and the rupee sign and Tamil names make that non-negotiable here.
 */
export const UTF8_BOM = '﻿';

export function csvCell(value: unknown): string {
  if (value == null) return '';
  const text = String(value);
  // Quote when the value contains a delimiter, quote or newline.
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(',');
}

export interface CsvSection {
  title?: string;
  headers: string[];
  rows: unknown[][];
}

/** Builds a CSV document, optionally with several titled blocks. */
export function buildCsv(sections: CsvSection[]): string {
  const lines: string[] = [];
  sections.forEach((section, index) => {
    if (index > 0) lines.push('');
    if (section.title) {
      lines.push(csvRow([section.title]));
      lines.push('');
    }
    lines.push(csvRow(section.headers));
    for (const row of section.rows) lines.push(csvRow(row));
  });
  // CRLF keeps Excel happy on every platform.
  return UTF8_BOM + lines.join('\r\n');
}

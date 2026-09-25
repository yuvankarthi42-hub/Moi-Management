import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

import { expenseCategoryMeta } from '../domain/categories';
import { functionTypeMeta } from '../domain/functionTypes';
import type { Dataset } from '../domain/models';
import {
  buildCollectionReport, buildExpenseReport, buildFunctionReport,
  buildPaymentMethodReport, buildPersonReport,
  buildTopContributors, buildVillageReport, type DateRange,
} from '../domain/selectors';
import { formatDate, formatMonth } from '../utils/date';
import { buildCsv, type CsvSection } from './csv';
import { canWritePdfFile, printHtml } from './printHtml';
import { buildReportHtml, type ReportKind } from './reportHtml';

export type ExportFormat = 'pdf' | 'csv';

export interface ExportRequest {
  kind: ReportKind;
  data: Dataset;
  format: ExportFormat;
  range?: DateRange;
}

/**
 * Exports a report and hands it to the OS share sheet.
 *
 * Files are written to the cache directory: they are throwaway artefacts once
 * shared, and the system reclaims the space on its own.
 */
export async function exportReport(request: ExportRequest): Promise<void> {
  try {
    const uri =
      request.format === 'pdf' ? await writePdf(request) : await writeCsv(request);

    // The web PDF path opens the print dialog and produces no file to share.
    if (!uri) return;

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: request.format === 'pdf' ? 'application/pdf' : 'text/csv',
        dialogTitle: 'Share report',
        UTI: request.format === 'pdf' ? 'com.adobe.pdf' : 'public.comma-separated-values-text',
      });
    } else {
      // Sharing is unavailable on web and some restricted devices.
      Alert.alert('Report saved', `The file is at:\n${uri}`);
    }
  } catch (error) {
    Alert.alert(
      'Export failed',
      error instanceof Error ? error.message : 'The report could not be created.',
    );
  }
}

async function writePdf({ kind, data, range }: ExportRequest): Promise<string | undefined> {
  const { html, title } = buildReportHtml(kind, data, range);

  // On web `printToFileAsync` is `window.print()`: it returns nothing, so
  // destructuring its result threw. Send the report to the print dialog
  // instead, where "save as PDF" produces the file.
  if (!canWritePdfFile) {
    await printHtml(html);
    return undefined;
  }

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // printToFileAsync produces a random filename; rename it so the share sheet
  // and the receiving app show something meaningful.
  const target = `${FileSystem.cacheDirectory}${fileName(title, 'pdf')}`;
  try {
    await FileSystem.moveAsync({ from: uri, to: target });
    return target;
  } catch {
    // A failed rename is cosmetic — share the original file rather than fail.
    return uri;
  }
}

async function writeCsv({ kind, data, range }: ExportRequest): Promise<string> {
  const { sections, title } = buildCsvSections(kind, data, range);
  const target = `${FileSystem.cacheDirectory}${fileName(title, 'csv')}`;
  await FileSystem.writeAsStringAsync(target, buildCsv(sections), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return target;
}

function fileName(title: string, extension: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug}-${stamp}.${extension}`;
}

/** Report data as CSV blocks — one section per logical table. */
function buildCsvSections(
  kind: ReportKind,
  data: Dataset,
  range?: DateRange,
): { sections: CsvSection[]; title: string } {
  switch (kind) {
    case 'function': {
      const report = buildFunctionReport(data, range);
      return {
        title: 'Function Report',
        sections: [
          {
            title: 'Function Report',
            headers: ['Function', 'Type', 'Date', 'Entries', 'Collected', 'Expenses'],
            rows: report.rows.map((r) => [
              r.title, functionTypeMeta(r.type).label, formatDate(r.date),
              r.entryCount, r.collected, r.expenses,
            ]),
          },
          {
            title: 'Summary',
            headers: ['Total collection', 'Functions', 'Average moi', 'Expenses'],
            rows: [[
              report.totalCollection, report.totalFunctions,
              report.averageMoi, report.totalExpenses,
            ]],
          },
        ],
      };
    }

    case 'person': {
      const rows = buildPersonReport(data, range);
      return {
        title: 'Person Report',
        sections: [{
          title: 'Person Report',
          headers: ['Name', 'Phone', 'Village', 'Functions', 'Total given'],
          rows: rows.map((r) => [r.name, r.phone ?? '', r.village ?? '', r.functionCount, r.total]),
        }],
      };
    }

    case 'village': {
      const rows = buildVillageReport(data, range);
      return {
        title: 'Village Report',
        sections: [{
          title: 'Village Report',
          headers: ['Village', 'People', 'Entries', 'Total'],
          rows: rows.map((r) => [r.label, r.peopleCount, r.entryCount, r.total]),
        }],
      };
    }

    case 'top-contributors': {
      const rows = buildTopContributors(data, 100, range);
      return {
        title: 'Top Contributors',
        sections: [{
          title: 'Top Contributors',
          headers: ['Rank', 'Name', 'Village', 'Functions', 'Total', 'Share %'],
          rows: rows.map((r) => [
            r.rank, r.name, r.village ?? '', r.functionCount, r.total, (r.share * 100).toFixed(2),
          ]),
        }],
      };
    }

    case 'expense': {
      const report = buildExpenseReport(data, range);
      return {
        title: 'Expense Report',
        sections: [
          {
            title: 'Expenses by category',
            headers: ['Category', 'Items', 'Total'],
            rows: report.rows.map((r) => [expenseCategoryMeta(r.key).label, r.count, r.total]),
          },
          {
            title: 'Every expense',
            headers: ['Function', 'Category', 'Date', 'Amount', 'Payment', 'Paid by', 'Notes'],
            rows: data.expenses.map((e) => [
              data.functions.find((f) => f.id === e.functionId)?.title ?? '',
              expenseCategoryMeta(e.category).label,
              formatDate(e.date),
              e.amount,
              e.paymentType,
              e.paidBy ?? '',
              e.notes ?? '',
            ]),
          },
        ],
      };
    }

    case 'payment-method': {
      const report = buildPaymentMethodReport(data, range);
      return {
        title: 'Payment Method Report',
        sections: [
          {
            title: 'Moi received',
            headers: ['Method', 'Entries', 'Amount'],
            rows: [
              ['Cash', report.moiCounts.cash, report.moi.cash],
              ['UPI', report.moiCounts.upi, report.moi.upi],
              ['Other', report.moiCounts.other, report.moi.other],
            ],
          },
          {
            title: 'Expenses paid',
            headers: ['Method', 'Amount'],
            rows: [
              ['Cash', report.expenses.cash],
              ['UPI', report.expenses.upi],
              ['Other', report.expenses.other],
            ],
          },
        ],
      };
    }

    case 'collection': {
      const report = buildCollectionReport(data, range);
      return {
        title: 'Moi Collection Report',
        sections: [{
          title: 'Month by month',
          headers: ['Month', 'Entries', 'Collected'],
          rows: report.rows.map((r) => [formatMonth(`${r.month}-01`), r.entryCount, r.total]),
        }],
      };
    }

    case 'summary':
    default: {
      const functions = buildFunctionReport(data, range);
      const people = buildPersonReport(data, range);
      const villages = buildVillageReport(data, range);
      return {
        title: 'Moi Summary',
        sections: [
          {
            title: 'Functions',
            headers: ['Function', 'Date', 'Entries', 'Collected', 'Expenses'],
            rows: functions.rows.map((r) => [
              r.title, formatDate(r.date), r.entryCount, r.collected, r.expenses,
            ]),
          },
          {
            title: 'People',
            headers: ['Name', 'Village', 'Functions', 'Total given'],
            rows: people.map((r) => [r.name, r.village ?? '', r.functionCount, r.total]),
          },
          {
            title: 'Villages',
            headers: ['Village', 'People', 'Total'],
            rows: villages.map((r) => [r.label, r.peopleCount, r.total]),
          },
          {
            title: 'Expenses',
            headers: ['Function', 'Category', 'Date', 'Amount', 'Payment'],
            rows: data.expenses.map((e) => [
              data.functions.find((f) => f.id === e.functionId)?.title ?? '',
              expenseCategoryMeta(e.category).label,
              formatDate(e.date),
              e.amount,
              e.paymentType,
            ]),
          },
        ],
      };
    }
  }
}

export type { ReportKind } from './reportHtml';

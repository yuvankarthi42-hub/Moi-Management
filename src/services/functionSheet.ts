import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { expenseCategoryMeta } from '../domain/categories';
import { functionTypeMeta, paymentTypeMeta } from '../domain/functionTypes';
import type { Expense } from '../domain/models';
import type { FunctionWithStats, GiftView, MoiEntryView } from '../domain/selectors';
import { formatDate, formatDateLong, formatTime } from '../utils/date';
import { formatMoney } from '../utils/format';
import { printHtml } from './printHtml';
import { page, table, tiles } from './reportHtml';

/**
 * Everything one function's sheet needs, passed in rather than read from a
 * Dataset: the screen already has these in hand, and the store reloads
 * asynchronously, so a sheet built from a fresh snapshot can lag an entry
 * behind what the host is looking at.
 */
export interface FunctionSheetInput {
  fn: FunctionWithStats;
  entries: MoiEntryView[];
  /** Gifts received at the function; reported in their own section. */
  gifts: GiftView[];
  expenses: Expense[];
  hostName: string;
}

/** A filename the receiving app can make sense of: moi-karthick-wedding.pdf */
function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'function'
  );
}

/**
 * The whole function as one printable document: what it was, who gave what,
 * and what it cost. The three sections are the answer to "send me the details"
 * — splitting them across files would only make them harder to keep together.
 */
export function buildFunctionSheetHtml({
  fn,
  entries,
  gifts,
  expenses,
  hostName,
}: FunctionSheetInput): { html: string; title: string } {
  const meta = functionTypeMeta(fn.type);
  const subtitle = [
    formatDateLong(fn.date),
    fn.time || undefined,
    fn.venue || undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  const net = fn.collected - fn.expenses;

  // --- 1. Overview -----------------------------------------------------
  // Details only — what the function was, not what it cost or brought in.
  // Moi collected, Gifts and Net used to be rows in this same table,
  // underneath a Status row, in the same left-aligned column of "Detail /
  // Value" pairs. Nothing here was ever wrong arithmetically — Net already
  // never counted a gift's value — but the *table* did not say that, and
  // reading three unrelated kinds of figure straight down one column reads as
  // one running total. Financial summary below is the only place money
  // appears now, and gifts get their own section entirely.
  const overviewRows: string[][] = [
    ['Function Type', `${meta.emoji}  ${meta.label}`],
    ['Date', formatDateLong(fn.date)],
    ...(fn.time ? [['Time', fn.time]] : []),
    ...(fn.venue ? [['Venue', fn.venue]] : []),
    ...(fn.village ? [['Village', fn.village]] : []),
    ...(fn.host ? [['Host', fn.host]] : []),
    ['Status', fn.status === 'upcoming' ? 'Upcoming' : 'Completed'],
  ];

  const overview =
    tiles([
      { k: 'Moi entries', v: String(fn.entryCount) },
      { k: 'Moi collected', v: formatMoney(fn.collected) },
      ...(fn.giftCount ? [{ k: 'Gifts', v: String(fn.giftCount) }] : []),
      { k: 'Expenses', v: formatMoney(fn.expenses) },
    ]) +
    '<h2>Function overview</h2>' +
    // numericFrom 2 keeps both columns left-aligned: these are labels and
    // values, not figures to compare down a column.
    table(['Detail', 'Value'], overviewRows, 2);

  // --- 1b. Financial summary --------------------------------------------
  // Moi and expenses only. A gift's value is never in this table, in Net, or
  // anywhere near it — see the Gifts section below instead.
  const financialRows: string[][] = [
    ['Moi collected', `${formatMoney(fn.collected)} from ${fn.entryCount} entries`],
    ['Expenses', `${formatMoney(fn.expenses)} across ${fn.expenseCount} items`],
    ['Net', `${net < 0 ? '-' : ''}${formatMoney(Math.abs(net))}`],
  ];
  const financialSummary =
    '<h2>Financial summary</h2>' + table(['Detail', 'Value'], financialRows, 2);

  // --- 2. Moi details ------------------------------------------------------
  const moi = entries.length
    ? table(
        ['#', 'Name', 'Village', 'Payment', 'Recorded', 'Amount'],
        entries.map((entry, index) => [
          String(index + 1),
          entry.person?.name ?? 'Unknown',
          entry.person?.village ?? '—',
          paymentTypeMeta(entry.paymentType).label,
          formatTime(entry.recordedAt),
          formatMoney(entry.amount),
        ]),
        5,
        ['', 'Total', '', '', '', formatMoney(fn.collected)],
      )
    : '<p class="sub">No moi recorded for this function.</p>';

  // --- 3. Gifts ------------------------------------------------------------
  // Their own section, not a column on the moi table: a gift has no payment
  // type, and its value — where there is one — is the host's own estimate,
  // never summed into moi collected, expenses or Net above.
  const giftSheet = gifts.length
    ? '<p class="sub">Not counted in moi collected, expenses or net.</p>' +
      table(
        ['#', 'From', 'Village', 'Gift', 'Value'],
        gifts.map((gift, index) => [
          String(index + 1),
          gift.person?.name ?? 'Unknown',
          gift.person?.village ?? '—',
          gift.name,
          gift.value ? `${formatMoney(gift.value)}*` : '—',
        ]),
        4,
      ) + '<p class="sub">* The host’s own estimate.</p>'
    : '';

  // --- 4. Expenses ---------------------------------------------------------
  const expenseSheet = expenses.length
    ? table(
        ['#', 'Category', 'Paid by', 'Payment', 'Date', 'Amount'],
        expenses.map((expense, index) => [
          String(index + 1),
          expenseCategoryMeta(expense.category).label,
          expense.paidBy || '—',
          paymentTypeMeta(expense.paymentType).label,
          formatDate(expense.date),
          formatMoney(expense.amount),
        ]),
        5,
        ['', 'Total', '', '', '', formatMoney(fn.expenses)],
      )
    : '<p class="sub">No expenses recorded for this function.</p>';

  const body =
    overview +
    financialSummary +
    (gifts.length
      ? `<h2>Gifts (${gifts.length} ${gifts.length === 1 ? 'gift' : 'gifts'})</h2>` + giftSheet
      : '') +
    `<h2>Moi details (${fn.entryCount} ${fn.entryCount === 1 ? 'entry' : 'entries'})</h2>` +
    moi +
    `<h2>Expenses (${fn.expenseCount} ${fn.expenseCount === 1 ? 'item' : 'items'})</h2>` +
    expenseSheet;

  return { html: page(fn.title, subtitle, body, hostName), title: fn.title };
}

export type SheetOutcome = 'shared-pdf' | 'printed' | 'unavailable';

/**
 * Hands the sheet over as a single PDF.
 *
 * Native writes a real file and opens the share sheet. Web has no file to
 * share — `expo-print` there is `window.print()` — so it goes straight to the
 * print dialog, where "Save as PDF" is the same document.
 */
export async function shareFunctionSheet(input: FunctionSheetInput): Promise<SheetOutcome> {
  const { html, title } = buildFunctionSheetHtml(input);

  if (Platform.OS === 'web') {
    try {
      await printHtml(html);
      return 'printed';
    } catch {
      return 'unavailable';
    }
  }

  try {
    if (await Sharing.isAvailableAsync()) {
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      // printToFileAsync names the file randomly; rename it so the share sheet
      // and the receiving app show the function rather than a hex string.
      const target = `${FileSystem.cacheDirectory}moi-${slug(title)}.pdf`;
      let fileUri = uri;
      try {
        await FileSystem.moveAsync({ from: uri, to: target });
        fileUri = target;
      } catch {
        // A failed rename is cosmetic — share the original rather than fail.
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${title}`,
        UTI: 'com.adobe.pdf',
      });
      return 'shared-pdf';
    }

    // No share sheet on this device, but it can still print to a file.
    await printHtml(html);
    return 'printed';
  } catch (error) {
    // Dismissing the share sheet is not a failure worth reporting.
    if (error instanceof Error && /cancel|abort|dismiss/i.test(error.message)) {
      return 'shared-pdf';
    }
    return 'unavailable';
  }
}

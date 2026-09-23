import * as Print from 'expo-print';
import { Alert, Platform, Share } from 'react-native';

import { paymentTypeMeta } from '../domain/functionTypes';
import type { FunctionEvent, MoiEntry, Person } from '../domain/models';
import { formatDate, formatDateLong, formatTime } from '../utils/date';
import { amountInWords, formatMoney, formatPhone } from '../utils/format';

/**
 * A printable receipt for one moi entry.
 *
 * Guests often ask for something in writing, and the host wants a record that
 * matches what went into the moi book — so the receipt carries the same detail
 * the entry does, plus the thank-you that makes it worth handing over.
 */
export interface ReceiptData {
  receiptNo: string;
  amount: number;
  amountWords: string;
  personName: string;
  personPhone?: string;
  personVillage?: string;
  functionTitle: string;
  functionDate: string;
  functionVenue?: string;
  paymentLabel: string;
  recordedAt: string;
  hostName: string;
  notes?: string;
}

/**
 * Builds the receipt from the pieces the caller already holds.
 *
 * Takes them explicitly rather than looking them up in a `Dataset`: the screen
 * that just saved an entry has the freshest copy, while the store's snapshot
 * reloads asynchronously and would still be one entry behind.
 */
export function buildReceipt({
  entry,
  functionEntries,
  person,
  fn,
  hostName,
}: {
  entry: MoiEntry;
  /** Every entry for the same function, used to number the receipt. */
  functionEntries: MoiEntry[];
  person?: Person;
  fn?: FunctionEvent;
  hostName: string;
}): ReceiptData {
  // Position in this function's own book, the way a paper receipt book runs.
  const indexInFunction =
    [...functionEntries]
      .filter((e) => e.functionId === entry.functionId)
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
      .findIndex((e) => e.id === entry.id) + 1;

  // Prefixed with the function's date, because the sequence restarts for every
  // function: without it the first entry of every function is "MOI-0001", and
  // a guest holding one receipt cannot tell which book it came from.
  const datePart = (fn?.date ?? entry.recordedAt.slice(0, 10)).replace(/-/g, '').slice(2);

  return {
    receiptNo: `MOI-${datePart}-${String(Math.max(indexInFunction, 1)).padStart(3, '0')}`,
    amount: entry.amount,
    amountWords: amountInWords(entry.amount),
    personName: person?.name ?? 'Guest',
    personPhone: person?.phone,
    personVillage: person?.village,
    functionTitle: fn?.title ?? 'Function',
    functionDate: fn?.date ?? entry.recordedAt.slice(0, 10),
    functionVenue: fn?.venue,
    paymentLabel: paymentTypeMeta(entry.paymentType).label,
    recordedAt: entry.recordedAt,
    hostName: hostName || 'Our family',
    notes: entry.notes,
  };
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The receipt as printable HTML, sized for a phone-friendly single page. */
export function buildReceiptHtml(receipt: ReceiptData): string {
  const row = (label: string, value?: string) =>
    value
      ? `<tr><td class="k">${esc(label)}</td><td class="v">${esc(value)}</td></tr>`
      : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, "Helvetica Neue", Roboto, sans-serif;
      margin: 0; padding: 20px; background: #F8F8FC; color: #171717;
    }
    .sheet {
      max-width: 420px; margin: 0 auto; background: #fff; border-radius: 14px;
      overflow: hidden; border: 1px solid #E8E5EF;
    }
    .head { background: #2D198F; color: #fff; padding: 18px; text-align: center; }
    .head h1 { font-size: 18px; margin: 0; font-weight: 600; }
    .head p { font-size: 12px; margin: 5px 0 0; color: #C9C0EC; }
    .amount { padding: 20px; text-align: center; border-bottom: 1px dashed #D6D2E4; }
    .amount .cap {
      font-size: 11px; color: #737373; letter-spacing: .6px; text-transform: uppercase;
    }
    .amount .fig { font-size: 34px; font-weight: 700; color: #159447; margin: 6px 0 0; }
    .amount .words { font-size: 13px; color: #171717; margin: 6px 0 0; }
    table { width: 100%; border-collapse: collapse; }
    .details { padding: 14px 18px; border-bottom: 1px dashed #D6D2E4; }
    .k { color: #737373; font-size: 13px; padding: 5px 0; text-align: left; }
    .v { color: #171717; font-size: 13px; padding: 5px 0; text-align: right; font-weight: 500; }
    .thanks { padding: 18px; text-align: center; }
    .thanks p { font-size: 13px; margin: 0; line-height: 1.6; }
    .thanks .sign { margin-top: 10px; font-weight: 600; }
    .foot {
      padding: 11px; text-align: center; background: #F8F8FC; border-top: 1px solid #E8E5EF;
      font-size: 11px; color: #737373;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { border: none; }
    }
  </style></head><body>
  <div class="sheet">
    <div class="head">
      <h1>${esc(receipt.functionTitle)}</h1>
      <p>${esc(formatDateLong(receipt.functionDate))}${
        receipt.functionVenue ? ` &middot; ${esc(receipt.functionVenue)}` : ''
      }</p>
    </div>

    <div class="amount">
      <div class="cap">Moi received with gratitude</div>
      <div class="fig">${esc(formatMoney(receipt.amount))}</div>
      <div class="words">${esc(receipt.amountWords)}</div>
    </div>

    <div class="details"><table>
      ${row('From', receipt.personName)}
      ${row('Phone', receipt.personPhone ? formatPhone(receipt.personPhone) : undefined)}
      ${row('Village', receipt.personVillage)}
      ${row('Payment', receipt.paymentLabel)}
      ${row('Recorded', `${formatDate(receipt.recordedAt.slice(0, 10))}, ${formatTime(receipt.recordedAt)}`)}
      ${row('Receipt no', receipt.receiptNo)}
      ${row('Note', receipt.notes)}
    </table></div>

    <div class="thanks">
      <p>Thank you for your kindness and blessings on this special day.</p>
      <p class="sign">&mdash; ${esc(receipt.hostName)} and family</p>
    </div>

    <div class="foot">Recorded with Moi Manager</div>
  </div>
  </body></html>`;
}

/** Opens the platform print dialog for the receipt. */
export async function printReceipt(receipt: ReceiptData): Promise<void> {
  try {
    await Print.printAsync({ html: buildReceiptHtml(receipt) });
  } catch (error) {
    // Dismissing the print dialog throws on iOS; that is not worth reporting.
    if (error instanceof Error && /cancel/i.test(error.message)) return;
    Alert.alert('Could not print', 'The receipt could not be sent to a printer.');
  }
}

/**
 * The receipt as plain text.
 *
 * Carries every line the printed receipt shows, because this is what a guest
 * actually receives over WhatsApp — a PDF arrives as a file they have to open,
 * while text is readable the moment it lands.
 */
export function buildReceiptText(receipt: ReceiptData): string {
  const line = (label: string, value?: string) => (value ? `${label}: ${value}` : undefined);

  return [
    receipt.functionTitle,
    `${formatDateLong(receipt.functionDate)}${
      receipt.functionVenue ? ` \u00B7 ${receipt.functionVenue}` : ''
    }`,
    '',
    'MOI RECEIVED WITH GRATITUDE',
    formatMoney(receipt.amount),
    receipt.amountWords,
    '',
    line('From', receipt.personName),
    line('Phone', receipt.personPhone ? formatPhone(receipt.personPhone) : undefined),
    line('Village', receipt.personVillage),
    line('Payment', receipt.paymentLabel),
    line(
      'Recorded',
      `${formatDate(receipt.recordedAt.slice(0, 10))}, ${formatTime(receipt.recordedAt)}`,
    ),
    line('Receipt no', receipt.receiptNo),
    line('Note', receipt.notes),
    '',
    'Thank you for your kindness and blessings on this special day.',
    `\u2014 ${receipt.hostName} and family`,
    '',
    'Recorded with Moi Manager',
  ]
    .filter((entry) => entry !== undefined)
    .join('\n');
}

/** What actually happened, so the caller can tell the user. */
export type ShareOutcome = 'shared' | 'copied' | 'unavailable';

/**
 * Shares the receipt as text.
 *
 * Text rather than a PDF attachment: these go to family over WhatsApp, where a
 * message is read immediately and a file has to be opened first.
 *
 * `Share.share` rejects outright in a browser without the Web Share API — most
 * desktop browsers, and anything not on HTTPS — so the receipt goes to the
 * clipboard there instead of the share silently doing nothing.
 */
export async function shareReceipt(receipt: ReceiptData): Promise<ShareOutcome> {
  const text = buildReceiptText(receipt);

  try {
    await Share.share({ message: text, title: `Moi receipt \u00B7 ${receipt.receiptNo}` });
    return 'shared';
  } catch (error) {
    // Dismissing the sheet is a normal outcome, not a failure.
    if (error instanceof Error && /cancel|abort|dismiss/i.test(error.message)) return 'shared';

    if (Platform.OS === 'web') {
      try {
        const clipboard = (globalThis as { navigator?: Navigator }).navigator?.clipboard;
        if (clipboard?.writeText) {
          await clipboard.writeText(text);
          return 'copied';
        }
      } catch {
        // Clipboard can be blocked by permissions; fall through.
      }
    }
    return 'unavailable';
  }
}

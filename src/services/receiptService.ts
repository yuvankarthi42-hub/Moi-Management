import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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

/**
 * Prints the receipt into a hidden frame, on web only.
 *
 * expo-print's web build is `window.print()` and nothing else — it ignores the
 * html it is handed and prints whatever is on screen, which is the app rather
 * than the receipt. Rendering into an offscreen iframe and printing that frame
 * is the only way to get the receipt itself onto the page.
 */
async function printHtmlOnWeb(html: string): Promise<void> {
  const doc = (globalThis as { document?: Document }).document;
  if (!doc?.body) throw new Error('No document to print into');

  const frame = doc.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  doc.body.appendChild(frame);

  try {
    const inner = frame.contentWindow;
    const innerDoc = inner?.document;
    if (!inner || !innerDoc) throw new Error('Print frame unavailable');

    innerDoc.open();
    innerDoc.write(html);
    innerDoc.close();

    // Give the frame a tick to lay out; printing an empty document otherwise.
    await new Promise<void>((resolve) => {
      if (innerDoc.readyState === 'complete') resolve();
      else frame.onload = () => resolve();
      setTimeout(resolve, 400);
    });

    inner.focus();
    inner.print();
  } finally {
    // The dialog is modal, so the frame can only go once it has been dismissed.
    setTimeout(() => frame.remove(), 1000);
  }
}

/** Opens the platform print dialog for the receipt. */
export async function printReceipt(receipt: ReceiptData): Promise<void> {
  const html = buildReceiptHtml(receipt);
  try {
    if (Platform.OS === 'web') {
      await printHtmlOnWeb(html);
      return;
    }
    await Print.printAsync({ html });
  } catch (error) {
    // Dismissing the print dialog throws on iOS; that is not worth reporting.
    if (error instanceof Error && /cancel|abort/i.test(error.message)) return;
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
export type ShareOutcome = 'shared-pdf' | 'shared-text' | 'copied' | 'print-instead' | 'unavailable';

/**
 * Shares the receipt as a PDF of the printed sheet.
 *
 * On a phone `printToFileAsync` renders the same html the printer would get,
 * and the share sheet hands over that file — so what the guest receives is the
 * receipt itself, not a description of it.
 *
 * The web build cannot do this: `expo-print` there is `window.print()` and
 * produces no file, and a browser PDF would mean pulling in a renderer. So web
 * shares the text and says so, with Print → "save as PDF" as the way to get
 * the document.
 */
export async function shareReceipt(receipt: ReceiptData): Promise<ShareOutcome> {
  const html = buildReceiptHtml(receipt);
  const text = buildReceiptText(receipt);

  if (Platform.OS !== 'web') {
    try {
      if (await Sharing.isAvailableAsync()) {
        const { uri } = await Print.printToFileAsync({ html, base64: false });

        // printToFileAsync names the file randomly; rename it so the share
        // sheet and the receiving app show the receipt number.
        const target = `${FileSystem.cacheDirectory}moi-receipt-${receipt.receiptNo}.pdf`;
        let fileUri = uri;
        try {
          await FileSystem.moveAsync({ from: uri, to: target });
          fileUri = target;
        } catch {
          // A failed rename is cosmetic — share the original rather than fail.
        }

        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share receipt',
          UTI: 'com.adobe.pdf',
        });
        return 'shared-pdf';
      }

      await Share.share({ message: text });
      return 'shared-text';
    } catch (error) {
      if (error instanceof Error && /cancel|abort|dismiss/i.test(error.message)) {
        return 'shared-pdf';
      }
      return 'unavailable';
    }
  }

  // Web: no PDF to hand over, so send the text and point at Print for the file.
  try {
    await Share.share({ message: text, title: `Moi receipt \u00B7 ${receipt.receiptNo}` });
    return 'shared-text';
  } catch (error) {
    if (error instanceof Error && /cancel|abort|dismiss/i.test(error.message)) {
      return 'shared-text';
    }
    try {
      const clipboard = (globalThis as { navigator?: Navigator }).navigator?.clipboard;
      if (clipboard?.writeText) {
        await clipboard.writeText(text);
        return 'copied';
      }
    } catch {
      // Clipboard can be blocked by permissions; fall through.
    }
    return 'print-instead';
  }
}

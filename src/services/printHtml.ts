import { Platform } from 'react-native';
import * as Print from 'expo-print';

/**
 * Sends a document to the platform's print dialog.
 *
 * `expo-print`'s web build is `window.print()` and nothing more: it discards
 * the html it is handed and prints whatever is on screen, which is the app.
 * On web the document therefore goes into an offscreen iframe and that frame
 * is printed instead. iOS and Android use expo-print directly.
 */
export async function printHtml(html: string): Promise<void> {
  if (Platform.OS !== 'web') {
    await Print.printAsync({ html });
    return;
  }

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

    // Give the frame a tick to lay out, or an empty page goes to the printer.
    await new Promise<void>((resolve) => {
      if (innerDoc.readyState === 'complete') resolve();
      else frame.onload = () => resolve();
      setTimeout(resolve, 400);
    });

    inner.focus();
    inner.print();
  } finally {
    // The dialog is modal, so the frame can only go once it is dismissed.
    setTimeout(() => frame.remove(), 1000);
  }
}

/** True when this platform can render a document to an actual PDF file. */
export const canWritePdfFile = Platform.OS !== 'web';

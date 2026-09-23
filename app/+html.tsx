import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

/**
 * The HTML shell for the web build.
 *
 * Expo's default viewport meta allows pinch-zoom; this pins the layout instead,
 * so the app behaves like the installed app rather than a zoomable page.
 *
 * Note `maximum-scale` / `user-scalable=no` is ignored by iOS Safari (since
 * iOS 10) by design — it takes effect on Android Chrome and desktop browsers.
 * Text still scales with the reader's own font-size setting, so this fixes the
 * layout without locking out anyone who needs larger type.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#18095A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Keeps the body from scrolling independently of the app's own views. */}
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: BASE_STYLE }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const BASE_STYLE = `
html, body, #root {
  height: 100%;
  overflow: hidden;
  overscroll-behavior: none;
}
body {
  margin: 0;
  /* Stops the double-tap-to-zoom gesture that the viewport meta cannot cover. */
  touch-action: manipulation;
  -webkit-text-size-adjust: 100%;
}
`;

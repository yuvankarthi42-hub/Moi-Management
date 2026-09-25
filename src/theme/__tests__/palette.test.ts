import { darkColors, lightColors, type Palette } from '../colors';

const palettes: Array<[string, Palette]> = [
  ['light', lightColors],
  ['dark', darkColors],
];

describe.each(palettes)('%s palette', (_name, colors) => {
  /**
   * Amounts reach the screen two ways — `Money` reads amountIn/amountOut, while
   * `StatRow` and plain `T` take a success/danger tone — so the same figure can
   * be rendered by either. They have to be the same green and the same red, or
   * the totals on one screen quietly disagree with the rows on another.
   */
  it('renders income the same whichever component draws it', () => {
    expect(colors.amountIn).toBe(colors.success);
  });

  it('renders money out the same whichever component draws it', () => {
    expect(colors.amountOut).toBe(colors.danger);
  });

  it('keeps income and outgoing visibly apart', () => {
    expect(colors.amountIn).not.toBe(colors.amountOut);
  });
});

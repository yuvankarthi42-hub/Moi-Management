import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

const GOLD = '#F2B544';
const GOLD_SOFT = 'rgba(242, 181, 68, 0.5)';

/**
 * One lotus petal, drawn pointing up from the centre and rotated into place.
 *
 * `tip` and `belly` are fractions of the mark's size: how far the petal
 * reaches, and how wide it swells on the way. Two rings drawn at different
 * fractions are what give the mandala its depth.
 */
function Petal({
  angle,
  size,
  tip,
  belly,
  base,
  stroke,
}: {
  angle: number;
  size: number;
  tip: number;
  belly: number;
  base: number;
  stroke: string;
}) {
  const c = size / 2;
  const top = c - size * tip;
  const w = size * belly;
  const bottom = c - size * base;

  return (
    <G rotation={angle} origin={`${c}, ${c}`}>
      <Path
        // Up one side to the tip and back down the other: two mirrored cubics
        // meeting at a point, which is what makes it read as a petal rather
        // than an ellipse.
        d={`M ${c} ${bottom}
            C ${c - w} ${bottom - (bottom - top) * 0.35}, ${c - w * 0.75} ${top + (bottom - top) * 0.18}, ${c} ${top}
            C ${c + w * 0.75} ${top + (bottom - top) * 0.18}, ${c + w} ${bottom - (bottom - top) * 0.35}, ${c} ${bottom}
            Z`}
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
        fill="none"
      />
    </G>
  );
}

/**
 * The launch screen's centrepiece: a gold lotus mandala with the app mark
 * inside.
 *
 * Drawn rather than shipped as an image so it stays crisp at every density and
 * the app carries no binary asset for it.
 */
export function MandalaMark({ size = 232 }: { size?: number }) {
  const c = size / 2;
  const outerRing = Array.from({ length: 12 }, (_, i) => i * 30);
  const innerRing = Array.from({ length: 12 }, (_, i) => i * 30 + 15);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Long petals reaching the edge. */}
      {outerRing.map((angle) => (
        <Petal
          key={`o${angle}`}
          angle={angle}
          size={size}
          tip={0.485}
          belly={0.105}
          base={0.16}
          stroke={GOLD}
        />
      ))}

      {/* A shorter ring offset by half a step, filling the gaps. */}
      {innerRing.map((angle) => (
        <Petal
          key={`i${angle}`}
          angle={angle}
          size={size}
          tip={0.395}
          belly={0.075}
          base={0.14}
          stroke={GOLD_SOFT}
        />
      ))}

      <Circle cx={c} cy={c} r={size * 0.305} stroke={GOLD_SOFT} strokeWidth={1} fill="none" />

      {/* The white disc the mark sits on, ringed in gold. */}
      <Circle cx={c} cy={c} r={size * 0.245} fill="#FFFFFF" />
      <Circle cx={c} cy={c} r={size * 0.245} stroke={GOLD} strokeWidth={2.5} fill="none" />

      {/* A hand holding a stack of coins — moi, given. */}
      <G>
        <Circle cx={c} cy={c - size * 0.112} r={size * 0.033} fill={GOLD} />
        <Circle cx={c} cy={c - size * 0.112} r={size * 0.033} stroke="#B8801C" strokeWidth={1} fill="none" />
        <Circle cx={c} cy={c - size * 0.043} r={size * 0.048} fill={GOLD} />
        <Circle cx={c} cy={c - size * 0.043} r={size * 0.048} stroke="#B8801C" strokeWidth={1} fill="none" />
        <Path
          d={`M ${c - size * 0.02} ${c - size * 0.043} h ${size * 0.04}`}
          stroke="#8A5A10"
          strokeWidth={1.4}
          strokeLinecap="round"
        />

        {/* Palm: a shallow bowl with a thumb rising on the left. */}
        <Path
          d={`M ${c - size * 0.145} ${c + size * 0.038}
              C ${c - size * 0.15} ${c + size * 0.115}, ${c + size * 0.15} ${c + size * 0.115}, ${c + size * 0.145} ${c + size * 0.038}
              C ${c + size * 0.142} ${c + size * 0.012}, ${c + size * 0.105} ${c + size * 0.012}, ${c + size * 0.1} ${c + size * 0.035}
              L ${c - size * 0.1} ${c + size * 0.035}
              C ${c - size * 0.105} ${c + size * 0.012}, ${c - size * 0.142} ${c + size * 0.012}, ${c - size * 0.145} ${c + size * 0.038}
              Z`}
          fill="#5B3BC4"
        />
      </G>
    </Svg>
  );
}

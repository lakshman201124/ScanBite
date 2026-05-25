"use client";

/**
 * luma-spin — morphing corner loader (brandassets/spinner.html)
 *
 * styled-jsx is stripped by Turbopack, so the animation comes from
 * globals.css (@keyframes loaderAnim + @theme --animate-loaderAnim).
 * The box-shadow is inline so it is never swallowed by Tailwind v4's
 * changed shadow-color composition rules.
 */

interface LumaSpinProps {
  /** #1f2937 = gray-800 (light surfaces), #f3f4f6 = gray-100 (dark surfaces) */
  shadowColor?: string;
}

export const Component = ({ shadowColor = "#1f2937" }: LumaSpinProps) => {
  const spanStyle: React.CSSProperties = {
    boxShadow: `inset 0 0 0 3px ${shadowColor}`,
    background: shadowColor,
  };

  return (
    <div className="relative w-[65px] aspect-square">
      <span
        className="absolute rounded-[50px] animate-loaderAnim"
        style={spanStyle}
      />
      <span
        className="absolute rounded-[50px] animate-loaderAnim animation-delay"
        style={spanStyle}
      />
    </div>
  );
};

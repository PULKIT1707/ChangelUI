/**
 * Logo cloud. Two rows of customer logos drifting in opposite directions with faded edges. Logos
 * sit in grayscale and bloom into their brand color on hover; a row pauses while hovered or focused.
 *
 * Copy-only template. It is responsive to its container (container queries). Under reduced motion
 * the rows stop and scroll by hand instead. Swap the inline marks for your customers' SVG logos.
 */
import { Marquee } from "changelui/marquee";
import type { ReactNode } from "react";

interface Logo {
  name: string;
  /** A token so the color follows the theme preset. */
  color: string;
  mark: ReactNode;
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const LOGOS: Logo[] = [
  { name: "Northwind", color: "var(--pui-chart-1)", mark: <path {...stroke} d="M4 19 12 4l8 15M8 13h8" /> },
  { name: "Lumen", color: "var(--pui-chart-2)", mark: <path fill="currentColor" d="M12 3a9 9 0 1 0 0 18 6.5 6.5 0 1 1 0-18Z" /> },
  { name: "Quanta", color: "var(--pui-chart-3)", mark: <path {...stroke} d="M5 5h14v14H5zM9 9h6v6H9z" /> },
  { name: "Helix", color: "var(--pui-chart-4)", mark: <path {...stroke} d="M6 3c0 6 12 6 12 12M6 21c0-6 12-6 12-12M8 8h8M8 16h8" /> },
  { name: "Orbital", color: "var(--pui-chart-5)", mark: <g {...stroke}><circle cx="12" cy="12" r="4" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)" /></g> },
  { name: "Vertex", color: "var(--pui-chart-6)", mark: <path fill="currentColor" d="M3 5h18l-9 15L3 5Z" /> },
  { name: "Nimbus", color: "var(--pui-chart-7)", mark: <path {...stroke} d="M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.5 1.5A3.3 3.3 0 0 1 17.5 18H7Z" /> },
  { name: "Polaris", color: "var(--pui-chart-8)", mark: <path fill="currentColor" d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z" /> },
  { name: "Tideline", color: "var(--pui-chart-1)", mark: <path {...stroke} d="M2 9c3-3 5 3 8 0s5 3 8 0 4 0 4 0M2 15c3-3 5 3 8 0s5 3 8 0 4 0 4 0" /> },
  { name: "Kestrel", color: "var(--pui-chart-3)", mark: <path {...stroke} d="m3 14 9-9 9 9-4 0-5-5-5 5H3ZM9 19h6" /> },
  { name: "Monolith", color: "var(--pui-chart-5)", mark: <path fill="currentColor" d="M8 3h8v18H8z" /> },
  { name: "Ember", color: "var(--pui-chart-6)", mark: <path fill="currentColor" d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 3 3 5 1-2 1-6 1-10Z" /> },
];

function LogoMark({ logo }: { logo: Logo }) {
  return (
    <span
      style={{ color: logo.color }}
      className="flex shrink-0 items-center gap-2.5 rounded-pui-lg px-3 py-2 opacity-60 grayscale transition-[filter,opacity] duration-300 hover:opacity-100 hover:grayscale-0 motion-reduce:transition-none"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7">
        {logo.mark}
      </svg>
      <span className="text-xl font-semibold tracking-tight text-pui-foreground">{logo.name}</span>
    </span>
  );
}

export default function LogoCloud() {
  const half = Math.ceil(LOGOS.length / 2);
  return (
    <section className="@container bg-pui-background px-5 py-16 text-pui-foreground @3xl:px-8 @3xl:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-10 flex max-w-xl flex-col items-center text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pui-primary-text">Customers</p>
          <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight @xl:text-3xl">Powering 40,000+ products, from weekend projects to the Fortune 500</h2>
        </div>
        <div className="flex flex-col gap-4">
          <Marquee duration={40} gap="2.5rem">
            {LOGOS.slice(0, half).map((logo) => (
              <LogoMark key={logo.name} logo={logo} />
            ))}
          </Marquee>
          <Marquee duration={46} gap="2.5rem" direction="right">
            {LOGOS.slice(half).map((logo) => (
              <LogoMark key={logo.name} logo={logo} />
            ))}
          </Marquee>
        </div>
        <p className="mt-10 text-center text-sm text-pui-muted-foreground">
          <a href="#customers" className="font-medium text-pui-primary-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring">
            Read customer stories →
          </a>
        </p>
      </div>
    </section>
  );
}

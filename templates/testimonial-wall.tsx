/**
 * Testimonial wall. Three columns of quotes drifting in alternating directions at different speeds,
 * with faded edges. Hovering or focusing a column pauses it so the quote can be read. One column on
 * narrow containers, two on medium, three on wide ones.
 *
 * Copy-only template. It is responsive to its container (container queries). Under reduced motion
 * the columns stop and scroll by hand instead.
 */
import { Avatar } from "changelui/avatar";
import { Marquee } from "changelui/marquee";
import { Rating } from "changelui/rating";

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  stars: number;
}

const QUOTES: Testimonial[] = [
  { name: "Ada Park", role: "Staff engineer, Lumen", stars: 5, quote: "We replaced four internal packages with this in a week. The motion defaults are better than what we had tuned by hand." },
  { name: "Malik Osei", role: "Founder, Tideline", stars: 5, quote: "Our landing page went from static to delightful in an afternoon, and Lighthouse did not even notice." },
  { name: "Rina Sato", role: "Design lead, Quanta", stars: 5, quote: "Finally a library where the reduced-motion path is designed, not an afterthought." },
  { name: "Leo Grant", role: "Frontend, Helix", stars: 4.5, quote: "The tokens map straight onto our design system. Dark mode was a non-event." },
  { name: "Ivy Chen", role: "Product engineer, Nimbus", stars: 5, quote: "Copying a single file and owning it is exactly the right trade-off for us." },
  { name: "Omar Haddad", role: "CTO, Vertex", stars: 5, quote: "Keyboard support everywhere. Our accessibility audit came back with two notes, both ours." },
  { name: "Sofia Lind", role: "Indie hacker", stars: 5, quote: "The pricing toggle with rolling numbers alone paid for the time I spent reading the docs." },
  { name: "Jonas Weber", role: "Engineering manager, Orbital", stars: 4.5, quote: "New hires ship polished UI in their first sprint. That is the real metric." },
  { name: "Priya Nair", role: "Designer, Polaris", stars: 5, quote: "The charts are the first ones I did not have to restyle from scratch." },
  { name: "Theo Martin", role: "Freelance developer", stars: 5, quote: "Clients ask what animation framework I use. I just say it came with the components." },
  { name: "Hana Kim", role: "Staff designer, Northwind", stars: 5, quote: "Themes are one attribute. We ship a seasonal look in a pull request of ten lines." },
  { name: "Diego Ruiz", role: "Full-stack, Tideline", stars: 4.5, quote: "Server rendering just works, and nothing flashes on hydration. That used to cost us days." },
];

function QuoteCard({ t }: { t: Testimonial }) {
  return (
    <figure className="flex w-full flex-col gap-4 rounded-pui-xl border border-pui-border bg-pui-surface p-5 text-pui-surface-foreground shadow-pui-xs">
      <Rating readOnly allowHalf value={t.stars} size="sm" />
      <blockquote className="text-pretty text-sm leading-relaxed">“{t.quote}”</blockquote>
      <figcaption className="flex items-center gap-3">
        <Avatar name={t.name} size="sm" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{t.name}</span>
          <span className="truncate text-xs text-pui-muted-foreground">{t.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

const COLUMNS = [
  { quotes: QUOTES.slice(0, 4), direction: "up" as const, duration: 38, className: "flex" },
  { quotes: QUOTES.slice(4, 8), direction: "down" as const, duration: 46, className: "hidden @2xl:flex" },
  { quotes: QUOTES.slice(8, 12), direction: "up" as const, duration: 42, className: "hidden @4xl:flex" },
];

export default function TestimonialWall() {
  return (
    <section className="@container bg-pui-background px-5 py-16 text-pui-foreground @3xl:px-8 @3xl:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 flex max-w-2xl flex-col items-center text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight @xl:text-4xl">Loved by people who ship</h2>
          <p className="mt-3 text-pretty text-pui-muted-foreground">Thousands of teams build their interfaces with us. Here is what a few of them say.</p>
          <div className="mt-6 flex items-center gap-3 rounded-pui-full border border-pui-border bg-pui-surface px-4 py-2 shadow-pui-xs">
            <Rating readOnly allowHalf value={4.9} size="sm" getLabel={() => "Average rating 4.9 out of 5"} />
            <span className="text-sm">
              <span className="font-semibold">4.9</span>
              <span className="text-pui-muted-foreground"> from 2,400+ reviews</span>
            </span>
          </div>
        </div>

        <div className="grid h-[36rem] grid-cols-1 gap-4 @2xl:grid-cols-2 @4xl:grid-cols-3">
          {COLUMNS.map((column, i) => (
            <Marquee
              key={i}
              direction={column.direction}
              duration={column.duration}
              repeat={2}
              className={`${column.className} h-full`}
            >
              {column.quotes.map((t) => (
                <QuoteCard key={t.name} t={t} />
              ))}
            </Marquee>
          ))}
        </div>
      </div>
    </section>
  );
}

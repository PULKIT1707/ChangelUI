import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type CardProps,
  type CardTitleProps,
} from "changelui";
import { toJsx } from "../../lib/to-jsx";
import { propDocs } from "../prop-docs";
import type { ItemModule } from "../types";

type DemoProps = { variant: NonNullable<CardProps["variant"]>; interactive: boolean; title: string };

const defaults: DemoProps = { variant: "outline", interactive: false, title: "Project Aurora" };

function Preview({ props }: { props: DemoProps }) {
  return (
    <Card variant={props.variant} interactive={props.interactive} className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>Deploys every weekday at 10:00.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm">Three services, two regions, zero open incidents.</CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" variant="ghost" tone="neutral">
          Details
        </Button>
        <Button size="sm">Deploy</Button>
      </CardFooter>
    </Card>
  );
}

function Mini() {
  return (
    <Card className="w-44">
      <CardHeader className="p-3">
        <CardTitle className="text-sm">Card</CardTitle>
        <CardDescription className="text-xs">Header and content</CardDescription>
      </CardHeader>
    </Card>
  );
}

const item: ItemModule<DemoProps> = {
  Preview,
  Mini,
  defaults,
  controls: [
    { type: "select", prop: "variant", label: "Variant", options: ["outline", "elevated", "soft"] },
    { type: "boolean", prop: "interactive", label: "Interactive" },
    { type: "text", prop: "title", label: "Title", maxLength: 40 },
  ],
  snippet: ({ title, ...props }) =>
    toJsx<Record<string, unknown>>(
      "Card",
      props,
      { variant: "outline", interactive: false },
      [
        "<CardHeader>",
        `  <CardTitle>${title}</CardTitle>`,
        "  <CardDescription>Deploys every weekday at 10:00.</CardDescription>",
        "</CardHeader>",
        "<CardContent>Three services, two regions.</CardContent>",
        "<CardFooter>",
        "  <Button size=\"sm\">Deploy</Button>",
        "</CardFooter>",
      ].join("\n"),
    ),
  propsTable: propDocs<CardProps & Pick<CardTitleProps, "as">>()([
    { name: "variant", type: '"outline" | "elevated" | "soft"', default: '"outline"', description: "Border, shadow or muted fill." },
    { name: "interactive", type: "boolean", default: "false", description: "Hover lift and shadow (CSS, motion-safe)." },
    { name: "asChild", type: "boolean", default: "false", description: "Render the single child (for example a link) as the card." },
    { name: "as", type: '"h2" | "h3" | "h4"', default: '"h3"', description: "CardTitle heading level." },
  ]),
  a11y: ["Pick the CardTitle heading level that fits the page outline.", "Use asChild with a link for a fully clickable card."],
  reducedMotion: "Interactive cards keep the shadow but do not lift.",
};

export default item;

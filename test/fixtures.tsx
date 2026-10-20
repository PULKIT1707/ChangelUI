// Fixtures for the invariant suites (smoke, ssr). Add one per component export when it lands.
//
// - `covers` lists every root export the fixture exercises (one Tabs fixture covers Tabs,
//   TabsList, TabsTrigger and TabsContent). smoke.test.tsx fails if a component export
//   (plan P14) is covered by no fixture.
// - `element(ref)` returns the element to render; attach `ref` to the component under test.
// - `ref: false` opts out of the `ref.current instanceof Element` assertion (for example
//   components that render null or portal their content).
import type * as React from "react";
import { useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  Avatar,
  AvatarGroup,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Calendar,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardStack,
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Checkbox,
  Chip,
  CircularProgress,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  ColorPicker,
  Combobox,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandMenu,
  CommandPage,
  CommandSeparator,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  CopyButton,
  DatePicker,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Dock,
  DockItem,
  DockSeparator,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DynamicIsland,
  DynamicIslandView,
  ExpandableSearch,
  FileDropzone,
  HoldToConfirm,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  IconButton,
  ImageCompare,
  Input,
  Kbd,
  Lightbox,
  LightboxTrigger,
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContent,
  MorphingDialogDescription,
  MorphingDialogImage,
  MorphingDialogSubtitle,
  MorphingDialogTitle,
  MorphingDialogTrigger,
  MultiSelect,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NumberInput,
  OtpInput,
  Pagination,
  PasswordInput,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  Progress,
  RadioGroup,
  RadioGroupItem,
  Rating,
  ReactionButton,
  ResizablePanels,
  RippleButton,
  ScrollArea,
  SegmentedControl,
  SegmentedControlItem,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  Separator,
  ShimmerButton,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarInset,
  SidebarItem,
  SidebarProvider,
  SidebarTrigger,
  Skeleton,
  SlideToConfirm,
  RangeSlider,
  Slider,
  SortableHandle,
  SortableItem,
  SortableList,
  Spinner,
  Stepper,
  Switch,
  Table,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TagInput,
  Textarea,
  ThemeSwitcher,
  ThemeToggle,
  Timeline,
  Toaster,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TreeView,
  CircularText,
  FancyUnderline,
  FlipCounter,
  GlitchText,
  GradientText,
  Highlighter,
  MorphingText,
  NumberTicker,
  RollingNumber,
  ScrambleText,
  ScrollTextReveal,
  ScrollVelocityText,
  SparklesText,
  SplitText,
  Terminal,
  TerminalLine,
  TextReveal,
  TextShimmer,
  TypingText,
  VariableProximity,
  WavyText,
  WordRotate,
  AnimatedBeam,
  AnimatedList,
  BorderBeam,
  ClickSpark,
  Confetti,
  CursorTrail,
  DotGlobe,
  ExpandingCards,
  FlipCard,
  GooeyButton,
  HoloCard,
  HorizontalScroll,
  ImageTrail,
  Lens,
  Magnetic,
  Marquee,
  OrbitingCircles,
  PageTransition,
  Parallax,
  ParallaxLayer,
  PixelReveal,
  ProximityGlow,
  Reveal,
  ScrollProgress,
  ScrollStack,
  ScrollStackItem,
  ShineBorder,
  SmoothCursor,
  SpotlightCard,
  Stagger,
  StaggerItem,
  StickerPeel,
  StickyReveal,
  TiltCard,
  ZoomParallax,
  AuroraBackground,
  Beams,
  DotField,
  DotPattern,
  FlickeringGrid,
  FlowField,
  GradientMesh,
  GridPattern,
  Halftone,
  LavaLamp,
  LightRays,
  MatrixRain,
  Meteors,
  NoiseOverlay,
  Particles,
  RetroGrid,
  Ripple,
  Starfield,
  Topography,
  Waves,
  useClickOutside,
  useControllableState,
  useCopyToClipboard,
  useElementSize,
  useFocusTrap,
  useMediaQuery,
  useMousePosition,
  usePointerProximity,
  usePrefersReducedMotion,
  useScrollDirection,
  useScrollVelocity,
  useViewTransition,
  useToast,
  AreaChart,
  BarChart,
  BarList,
  BarRace,
  BeeswarmChart,
  BoxPlot,
  BumpChart,
  CalendarHeatmap,
  CandlestickChart,
  Chart,
  ChartExport,
  ChartInsights,
  ChartSonify,
  ChartSummary,
  InsightList,
  ChartZoom,
  ComboChart,
  DiffChart,
  DumbbellChart,
  FunnelChart,
  GanttChart,
  GaugeChart,
  HeatmapChart,
  HistogramChart,
  LineChart,
  LiveChart,
  MorphChart,
  NetworkGraph,
  ParallelCoordinates,
  PieChart,
  RadarChart,
  RidgelineChart,
  SankeyChart,
  ScatterChart,
  ScrollyChart,
  SlopeChart,
  SmallMultiples,
  Sparkline,
  StatCard,
  StatusTracker,
  StreamChart,
  SunburstChart,
  TreemapChart,
  WaterfallChart,
  WhatIfChart,
  YouDrawIt,
  LineSeries,
  ResizablePanel,
  ResizableHandle,
  StepperItem,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  TimelineItem,
} from "../src/index";

const TREE_ROWS = [
  { l: "A", v: 0, children: [{ l: "A1", v: 3 }, { l: "A2", v: 2 }] },
  { l: "B", v: 4 },
];
const CHART_ROWS = [{ m: "Jan", a: 3, b: 2 }, { m: "Feb", a: 5, b: 3 }, { m: "Mar", a: 4, b: 4 }, { m: "Apr", a: 8, b: 5 }];

export interface Fixture {
  name: string;
  covers: string[];
  element: (ref: React.RefObject<Element | null>) => React.ReactElement;
  ref?: boolean;
}

const asRef = <T,>(ref: React.RefObject<Element | null>) => ref as unknown as React.Ref<T>;
function BeamFixture({ beamRef }: { beamRef: React.Ref<SVGSVGElement> }) {
  const container = useRef<HTMLDivElement>(null);
  const from = useRef<HTMLSpanElement>(null);
  const to = useRef<HTMLSpanElement>(null);
  return (
    <div ref={container} className="relative">
      <span ref={from}>A</span>
      <span ref={to}>B</span>
      <AnimatedBeam ref={beamRef} containerRef={container} fromRef={from} toRef={to} />
    </div>
  );
}

export const fixtures: Fixture[] = [
  {
    name: "Accordion",
    covers: ["Accordion", "AccordionItem", "AccordionTrigger", "AccordionContent"],
    element: (ref) => (
      <Accordion ref={asRef<HTMLDivElement>(ref)} defaultValue="a">
        <AccordionItem value="a">
          <AccordionTrigger>First</AccordionTrigger>
          <AccordionContent>One</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b" disabled>
          <AccordionTrigger icon={null}>Second</AccordionTrigger>
          <AccordionContent forceMount>Two</AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
  },
  {
    name: "Accordion multiple",
    covers: ["Accordion", "AccordionItem", "AccordionTrigger", "AccordionContent"],
    element: (ref) => (
      <Accordion ref={asRef<HTMLDivElement>(ref)} type="multiple" defaultValue={["a"]} variant="separated" headingLevel={4}>
        <AccordionItem value="a">
          <AccordionTrigger>First</AccordionTrigger>
          <AccordionContent>One</AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
  },
  {
    name: "Dialog",
    covers: [
      "Dialog",
      "DialogTrigger",
      "DialogContent",
      "DialogHeader",
      "DialogTitle",
      "DialogDescription",
      "DialogFooter",
      "DialogClose",
    ],
    element: (ref) => (
      <Dialog>
        <DialogTrigger ref={asRef<HTMLButtonElement>(ref)}>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose>Cancel</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    ),
  },
  {
    name: "Dialog open",
    covers: ["Dialog", "DialogContent", "DialogTitle"],
    element: (ref) => (
      <Dialog defaultOpen>
        <DialogContent ref={asRef<HTMLDivElement>(ref)} size="sm">
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    ),
  },
  {
    name: "Dock",
    covers: ["Dock", "DockItem", "DockSeparator"],
    element: (ref) => (
      <Dock ref={asRef<HTMLDivElement>(ref)}>
        <DockItem label="Home" active>
          H
        </DockItem>
        <DockSeparator />
        <DockItem label="Mail">M</DockItem>
      </Dock>
    ),
  },
  {
    name: "Drawer",
    covers: [
      "Drawer",
      "DrawerTrigger",
      "DrawerContent",
      "DrawerHeader",
      "DrawerTitle",
      "DrawerDescription",
      "DrawerFooter",
      "DrawerClose",
    ],
    element: (ref) => (
      <Drawer>
        <DrawerTrigger ref={asRef<HTMLButtonElement>(ref)}>Open</DrawerTrigger>
        <DrawerContent side="bottom">
          <DrawerHeader>
            <DrawerTitle>Title</DrawerTitle>
            <DrawerDescription>Description</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose>Close</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    ),
  },
  {
    name: "DropdownMenu",
    covers: [
      "DropdownMenu",
      "DropdownMenuTrigger",
      "DropdownMenuContent",
      "DropdownMenuLabel",
      "DropdownMenuGroup",
      "DropdownMenuItem",
      "DropdownMenuCheckboxItem",
      "DropdownMenuSeparator",
      "DropdownMenuSub",
      "DropdownMenuSubTrigger",
      "DropdownMenuSubContent",
      "DropdownMenuRadioGroup",
      "DropdownMenuRadioItem",
    ],
    element: (ref) => (
      <DropdownMenu>
        <DropdownMenuTrigger ref={asRef<HTMLButtonElement>(ref)}>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuCheckboxItem defaultChecked>Notifications</DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Copy link</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuRadioGroup defaultValue="name">
            <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="date">Date</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem tone="danger">Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
  {
    name: "DynamicIsland",
    covers: ["DynamicIsland", "DynamicIslandView"],
    element: (ref) => (
      <DynamicIsland ref={asRef<HTMLDivElement>(ref)} state="idle">
        <DynamicIslandView name="idle" label="Idle">
          Sample
        </DynamicIslandView>
        <DynamicIslandView name="music" label="Playing" expanded={<p>Details</p>}>
          Music
        </DynamicIslandView>
      </DynamicIsland>
    ),
  },
  {
    name: "ExpandableSearch",
    covers: ["ExpandableSearch"],
    element: (ref) => <ExpandableSearch ref={asRef<HTMLDivElement>(ref)} suggestions={["Sample"]} />,
  },
  {
    name: "FileDropzone",
    covers: ["FileDropzone"],
    element: (ref) => <FileDropzone ref={asRef<HTMLDivElement>(ref)} accept="image/*" files={[{ id: "a", name: "a.png", size: 1024, status: "done" }]} />,
  },
  {
    name: "HoldToConfirm",
    covers: ["HoldToConfirm"],
    element: (ref) => (
      <HoldToConfirm ref={asRef<HTMLButtonElement>(ref)} onConfirm={() => {}}>
        Sample
      </HoldToConfirm>
    ),
  },
  {
    name: "HoverCard",
    covers: ["HoverCard", "HoverCardTrigger", "HoverCardContent"],
    element: (ref) => (
      <HoverCard>
        <HoverCardTrigger ref={asRef<HTMLAnchorElement>(ref)} href="#profile">
          @pulls
        </HoverCardTrigger>
        <HoverCardContent>Profile preview</HoverCardContent>
      </HoverCard>
    ),
  },
  {
    name: "Popover",
    covers: ["Popover", "PopoverTrigger", "PopoverContent", "PopoverClose"],
    element: (ref) => (
      <Popover>
        <PopoverTrigger ref={asRef<HTMLButtonElement>(ref)}>Open</PopoverTrigger>
        <PopoverContent aria-label="Details">
          <PopoverClose>Close</PopoverClose>
        </PopoverContent>
      </Popover>
    ),
  },
  {
    name: "Tabs",
    covers: ["Tabs", "TabsList", "TabsTrigger", "TabsContent"],
    element: (ref) => (
      <Tabs ref={asRef<HTMLDivElement>(ref)}>
        <TabsList aria-label="Sections">
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">First</TabsContent>
        <TabsContent value="two">Second</TabsContent>
      </Tabs>
    ),
  },
  {
    name: "Tabs with defaultValue",
    covers: ["Tabs", "TabsList", "TabsTrigger", "TabsContent"],
    element: (ref) => (
      <Tabs ref={asRef<HTMLDivElement>(ref)} defaultValue="two">
        <TabsList aria-label="Sections" variant="underline" fullWidth>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two" icon={<span />}>
            Two
          </TabsTrigger>
        </TabsList>
        <TabsContent value="one" forceMount>
          First
        </TabsContent>
        <TabsContent value="two">Second</TabsContent>
      </Tabs>
    ),
  },
  {
    name: "TagInput",
    covers: ["TagInput"],
    element: (ref) => <TagInput ref={asRef<HTMLDivElement>(ref)} listLabel="Tags" inputProps={{ "aria-label": "Add tag" }} defaultValue={["react"]} />,
  },
  {
    name: "ThemeToggle",
    covers: ["ThemeToggle"],
    element: (ref) => (
      <ThemeToggle ref={asRef<HTMLButtonElement>(ref)} storageKey={null} applyToDocument={false} transition="none" />
    ),
  },
  {
    name: "Timeline",
    covers: ["Timeline", "TimelineItem"],
    element: (ref) => (
      <Timeline ref={asRef<HTMLOListElement>(ref)} animate="none">
        <TimelineItem time="Today" dateTime="2026-01-01" title="Shipped" />
      </Timeline>
    ),
  },
  {
    name: "Toaster",
    covers: ["Toaster"],
    element: (ref) => <Toaster ref={asRef<HTMLElement>(ref)} position="top-center" />,
  },
  {
    name: "ToggleGroup",
    covers: ["ToggleGroup", "ToggleGroupItem"],
    element: (ref) => (
      <ToggleGroup ref={asRef<HTMLDivElement>(ref)} aria-label="Align" defaultValue="left">
        <ToggleGroupItem value="left">Left</ToggleGroupItem>
        <ToggleGroupItem value="right">Right</ToggleGroupItem>
      </ToggleGroup>
    ),
  },
  {
    name: "Toggle",
    covers: ["Toggle"],
    element: (ref) => (
      <Toggle ref={asRef<HTMLButtonElement>(ref)} aria-label="Bold">
        B
      </Toggle>
    ),
  },
  {
    name: "Tooltip",
    covers: ["Tooltip"],
    element: (ref) => (
      <Tooltip ref={asRef<HTMLDivElement>(ref)} content="Hint" defaultOpen arrow>
        <button type="button">Trigger</button>
      </Tooltip>
    ),
  },
  {
    name: "TreeView",
    covers: ["TreeView"],
    element: (ref) => <TreeView ref={asRef<HTMLDivElement>(ref)} label="Files" items={[{ id: "a", label: "a", children: [{ id: "b", label: "b" }] }]} defaultExpanded={["a"]} />,
  },
  {
    name: "Alert",
    covers: ["Alert"],
    element: (ref) => (
      <Alert ref={asRef<HTMLDivElement>(ref)} tone="warning" title="Heads up" live onDismiss={() => {}}>
        Body
      </Alert>
    ),
  },
  {
    name: "Avatar",
    covers: ["Avatar"],
    element: (ref) => <Avatar ref={asRef<HTMLSpanElement>(ref)} name="Ada Lovelace" status="online" />,
  },
  {
    name: "AvatarGroup",
    covers: ["AvatarGroup", "Avatar"],
    element: (ref) => (
      <AvatarGroup ref={asRef<HTMLDivElement>(ref)} max={2} size="sm">
        <Avatar name="Ada Lovelace" />
        <Avatar name="Grace Hopper" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />
        <Avatar name="Alan Turing" />
      </AvatarGroup>
    ),
  },
  {
    name: "Badge",
    covers: ["Badge"],
    element: (ref) => (
      <Badge ref={asRef<HTMLSpanElement>(ref)} tone="success" dot pulse>
        Live
      </Badge>
    ),
  },
  {
    name: "Breadcrumb",
    covers: ["Breadcrumb", "BreadcrumbItem"],
    element: (ref) => (
      <Breadcrumb ref={asRef<HTMLElement>(ref)} maxItems={3}>
        <BreadcrumbItem href="#home">Home</BreadcrumbItem>
        <BreadcrumbItem href="#docs">Docs</BreadcrumbItem>
        <BreadcrumbItem href="#components">Components</BreadcrumbItem>
        <BreadcrumbItem current>Breadcrumb</BreadcrumbItem>
      </Breadcrumb>
    ),
  },
  {
    name: "Button",
    covers: ["Button"],
    element: (ref) => (
      <Button ref={asRef<HTMLButtonElement>(ref)} loading loadingText="Saving">
        Save
      </Button>
    ),
  },
  {
    name: "Button asChild",
    covers: ["Button"],
    element: (ref) => (
      <Button ref={asRef<HTMLButtonElement>(ref)} asChild variant="link">
        <a href="#docs">Docs</a>
      </Button>
    ),
  },
  {
    name: "Calendar",
    covers: ["Calendar"],
    element: (ref) => <Calendar ref={asRef<HTMLDivElement>(ref)} month="2024-03" defaultValue="2024-03-09" today="2024-03-12" />,
  },
  {
    name: "Card",
    covers: ["Card", "CardHeader", "CardTitle", "CardDescription", "CardContent", "CardFooter"],
    element: (ref) => (
      <Card ref={asRef<HTMLDivElement>(ref)} interactive>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    ),
  },
  {
    name: "CardStack",
    covers: ["CardStack"],
    element: (ref) => (
      <CardStack
        ref={asRef<HTMLDivElement>(ref)}
        items={["One", "Two", "Three"]}
        renderCard={(text) => <div className="h-20 p-4">{text}</div>}
      />
    ),
  },
  {
    name: "Carousel",
    covers: ["Carousel", "CarouselContent", "CarouselItem", "CarouselPrevious", "CarouselNext", "CarouselDots"],
    element: (ref) => (
      <Carousel ref={asRef<HTMLElement>(ref)} aria-label="Sample">
        <CarouselContent>
          <CarouselItem>One</CarouselItem>
          <CarouselItem>Two</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
        <CarouselDots />
      </Carousel>
    ),
  },
  {
    name: "Chip static",
    covers: ["Chip"],
    element: (ref) => <Chip ref={asRef<HTMLElement>(ref)}>Static</Chip>,
  },
  {
    name: "Chip selectable",
    covers: ["Chip"],
    element: (ref) => (
      <Chip ref={asRef<HTMLElement>(ref)} defaultSelected>
        Selectable
      </Chip>
    ),
  },
  {
    name: "Chip removable",
    covers: ["Chip"],
    element: (ref) => (
      <Chip ref={asRef<HTMLElement>(ref)} onRemove={() => {}} removeLabel="Remove React">
        React
      </Chip>
    ),
  },
  {
    name: "Chip selectable and removable",
    covers: ["Chip"],
    element: (ref) => (
      <Chip ref={asRef<HTMLElement>(ref)} defaultSelected onRemove={() => {}} removeLabel="Remove Vue">
        Vue
      </Chip>
    ),
  },
  {
    name: "Collapsible",
    covers: ["Collapsible", "CollapsibleTrigger", "CollapsibleContent"],
    element: (ref) => (
      <Collapsible ref={asRef<HTMLDivElement>(ref)} defaultOpen>
        <CollapsibleTrigger>Details</CollapsibleTrigger>
        <CollapsibleContent>Hidden text</CollapsibleContent>
      </Collapsible>
    ),
  },
  {
    name: "ColorPicker",
    covers: ["ColorPicker"],
    element: (ref) => <ColorPicker ref={asRef<HTMLDivElement>(ref)} defaultValue="#22c55e" swatches={["#22c55e", "#0ea5e9"]} showAlpha />,
  },
  {
    name: "Combobox",
    covers: ["Combobox"],
    element: (ref) => <Combobox ref={asRef<HTMLInputElement>(ref)} aria-label="Fruit" options={["Apple", "Pear"]} defaultValue="Pear" />,
  },
  {
    name: "Command",
    covers: ["Command", "CommandInput", "CommandList", "CommandGroup", "CommandItem", "CommandEmpty", "CommandSeparator", "CommandPage"],
    element: (ref) => (
      <Command ref={asRef<HTMLDivElement>(ref)} label="Actions">
        <CommandInput aria-label="Search" />
        <CommandList>
          <CommandEmpty />
          <CommandGroup heading="Files">
            <CommandItem shortcut="⌘ N">New file</CommandItem>
            <CommandItem toPage="theme">Theme</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandPage name="theme">
            <CommandItem>Dark</CommandItem>
          </CommandPage>
        </CommandList>
      </Command>
    ),
  },
  {
    name: "CommandMenu",
    covers: ["CommandMenu"],
    ref: false,
    element: (ref) => (
      <CommandMenu ref={asRef<HTMLDivElement>(ref)} hotkey={null}>
        <CommandInput aria-label="Search" />
      </CommandMenu>
    ),
  },
  {
    name: "ContextMenu",
    covers: ["ContextMenu", "ContextMenuTrigger", "ContextMenuContent", "ContextMenuItem"],
    element: (ref) => (
      <ContextMenu>
        <ContextMenuTrigger ref={asRef<HTMLDivElement>(ref)} tabIndex={0}>
          Right-click here
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Copy</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    ),
  },
  {
    name: "CopyButton",
    covers: ["CopyButton"],
    element: (ref) => <CopyButton ref={asRef<HTMLButtonElement>(ref)} value="npm i changelui" />,
  },
  {
    name: "CopyButton showLabel",
    covers: ["CopyButton"],
    element: (ref) => <CopyButton ref={asRef<HTMLButtonElement>(ref)} value={() => "x"} showLabel />,
  },
  {
    name: "DatePicker",
    covers: ["DatePicker"],
    element: (ref) => <DatePicker ref={asRef<HTMLInputElement>(ref)} aria-label="Date" defaultValue="2024-03-09" />,
  },
  {
    name: "IconButton",
    covers: ["IconButton"],
    element: (ref) => (
      <IconButton ref={asRef<HTMLButtonElement>(ref)} aria-label="Close" shape="circle">
        x
      </IconButton>
    ),
  },
  {
    name: "ImageCompare",
    covers: ["ImageCompare"],
    element: (ref) => <ImageCompare ref={asRef<HTMLDivElement>(ref)} before={<div>Before</div>} after={<div>After</div>} />,
  },
  {
    name: "Kbd",
    covers: ["Kbd"],
    element: (ref) => <Kbd ref={asRef<HTMLElement>(ref)}>K</Kbd>,
  },
  {
    name: "Lightbox",
    covers: ["Lightbox", "LightboxTrigger"],
    element: (ref) => (
      <Lightbox
        ref={asRef<HTMLDivElement>(ref)}
        images={[
          { src: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", alt: "One" },
          { src: "data:image/gif;base64,R0lGODlhAQABAAAAACw=#2", alt: "Two" },
        ]}
      >
        <LightboxTrigger index={0} />
        <LightboxTrigger index={1} />
      </Lightbox>
    ),
  },
  {
    name: "MorphingDialog",
    covers: [
      "MorphingDialog",
      "MorphingDialogTrigger",
      "MorphingDialogContent",
      "MorphingDialogImage",
      "MorphingDialogTitle",
      "MorphingDialogSubtitle",
      "MorphingDialogDescription",
      "MorphingDialogClose",
    ],
    element: (ref) => (
      <MorphingDialog>
        <MorphingDialogTrigger ref={asRef<HTMLButtonElement>(ref)}>
          <MorphingDialogImage src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="Sample" />
          <MorphingDialogTitle>Sample</MorphingDialogTitle>
          <MorphingDialogSubtitle>Subtitle</MorphingDialogSubtitle>
        </MorphingDialogTrigger>
        <MorphingDialogContent>
          <MorphingDialogTitle>Sample</MorphingDialogTitle>
          <MorphingDialogDescription>Description</MorphingDialogDescription>
          <MorphingDialogClose />
        </MorphingDialogContent>
      </MorphingDialog>
    ),
  },
  {
    name: "MultiSelect",
    covers: ["MultiSelect"],
    element: (ref) => (
      <MultiSelect ref={asRef<HTMLDivElement>(ref)} aria-label="Tags" options={["React", "Vue"]} defaultValue={["React"]} />
    ),
  },
  {
    name: "NavigationMenu",
    covers: [
      "NavigationMenu",
      "NavigationMenuList",
      "NavigationMenuItem",
      "NavigationMenuTrigger",
      "NavigationMenuContent",
      "NavigationMenuLink",
    ],
    element: (ref) => (
      <NavigationMenu ref={asRef<HTMLElement>(ref)}>
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="#a">Analytics</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="#pricing" active>
              Pricing
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    ),
  },
  {
    name: "NumberInput",
    covers: ["NumberInput"],
    element: (ref) => <NumberInput ref={asRef<HTMLDivElement>(ref)} aria-label="Quantity" defaultValue={2} min={0} max={10} />,
  },
  {
    name: "OtpInput",
    covers: ["OtpInput"],
    element: (ref) => <OtpInput ref={asRef<HTMLDivElement>(ref)} defaultValue="12" />,
  },
  {
    name: "Pagination",
    covers: ["Pagination"],
    element: (ref) => <Pagination ref={asRef<HTMLElement>(ref)} count={12} defaultPage={5} />,
  },
  {
    name: "PasswordInput",
    covers: ["PasswordInput"],
    element: (ref) => <PasswordInput ref={asRef<HTMLInputElement>(ref)} aria-label="Password" strength />,
  },
  {
    name: "Progress",
    covers: ["Progress"],
    element: (ref) => <Progress ref={asRef<HTMLDivElement>(ref)} value={42} showValue striped />,
  },
  {
    name: "Progress indeterminate",
    covers: ["Progress"],
    element: (ref) => <Progress ref={asRef<HTMLDivElement>(ref)} />,
  },
  {
    name: "CircularProgress",
    covers: ["CircularProgress"],
    element: (ref) => <CircularProgress ref={asRef<HTMLDivElement>(ref)} value={60} showValue />,
  },
  {
    name: "RippleButton",
    covers: ["RippleButton"],
    element: (ref) => <RippleButton ref={asRef<HTMLButtonElement>(ref)}>Ripple</RippleButton>,
  },
  {
    name: "ScrollArea",
    covers: ["ScrollArea"],
    element: (ref) => <ScrollArea ref={asRef<HTMLDivElement>(ref)} label="List">Sample</ScrollArea>,
  },
  {
    name: "Separator",
    covers: ["Separator"],
    element: (ref) => <Separator ref={asRef<HTMLDivElement>(ref)} label="OR" decorative={false} />,
  },
  {
    name: "ShimmerButton",
    covers: ["ShimmerButton"],
    element: (ref) => <ShimmerButton ref={asRef<HTMLButtonElement>(ref)}>Shimmer</ShimmerButton>,
  },
  {
    name: "Sidebar",
    covers: ["SidebarProvider", "Sidebar", "SidebarContent", "SidebarGroup", "SidebarItem", "SidebarInset", "SidebarTrigger"],
    element: (ref) => (
      <SidebarProvider ref={asRef<HTMLDivElement>(ref)}>
        <Sidebar label="Main">
          <SidebarContent>
            <SidebarGroup label="Workspace">
              <SidebarItem href="#inbox" active>
                Inbox
              </SidebarItem>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <SidebarTrigger />
        </SidebarInset>
      </SidebarProvider>
    ),
  },
  {
    name: "Skeleton",
    covers: ["Skeleton"],
    element: (ref) => <Skeleton ref={asRef<HTMLDivElement>(ref)} shape="text" lines={3} />,
  },
  {
    name: "SlideToConfirm",
    covers: ["SlideToConfirm"],
    element: (ref) => <SlideToConfirm ref={asRef<HTMLDivElement>(ref)} onConfirm={() => {}} />,
  },
  {
    name: "Spinner",
    covers: ["Spinner"],
    element: (ref) => <Spinner ref={asRef<HTMLSpanElement>(ref)} variant="dots" />,
  },
  {
    name: "Stepper",
    covers: ["Stepper", "StepperItem"],
    element: (ref) => (
      <Stepper ref={asRef<HTMLOListElement>(ref)} defaultValue={1} aria-label="Progress">
        <StepperItem title="One" />
        <StepperItem title="Two" />
      </Stepper>
    ),
  },
  {
    name: "Checkbox",
    covers: ["Checkbox"],
    element: (ref) => (
      <Checkbox ref={asRef<HTMLButtonElement>(ref)} aria-label="Accept" defaultChecked="indeterminate" name="accept" />
    ),
  },
  {
    name: "Input",
    covers: ["Input"],
    element: (ref) => (
      <Input ref={asRef<HTMLInputElement>(ref)} aria-label="Email" placeholder="you@example.com" leadingIcon={<span />} />
    ),
  },
  {
    name: "RadioGroup",
    covers: ["RadioGroup", "RadioGroupItem"],
    element: (ref) => (
      <RadioGroup ref={asRef<HTMLDivElement>(ref)} aria-label="Plan" name="plan">
        <RadioGroupItem value="free" aria-label="Free" />
        <RadioGroupItem value="pro" aria-label="Pro" />
        <RadioGroupItem value="team" aria-label="Team" disabled />
      </RadioGroup>
    ),
  },
  {
    name: "RadioGroup with defaultValue",
    covers: ["RadioGroup", "RadioGroupItem"],
    element: (ref) => (
      <RadioGroup ref={asRef<HTMLDivElement>(ref)} aria-label="Plan" defaultValue="pro" orientation="horizontal">
        <RadioGroupItem value="free" aria-label="Free" />
        <RadioGroupItem value="pro" aria-label="Pro" />
      </RadioGroup>
    ),
  },
  {
    name: "Rating",
    covers: ["Rating"],
    element: (ref) => <Rating ref={asRef<HTMLDivElement>(ref)} defaultValue={3.5} allowHalf name="stars" />,
  },
  {
    name: "Rating readOnly",
    covers: ["Rating"],
    element: (ref) => <Rating ref={asRef<HTMLDivElement>(ref)} value={4} readOnly />,
  },
  {
    name: "ReactionButton",
    covers: ["ReactionButton"],
    element: (ref) => (
      <ReactionButton
        ref={asRef<HTMLDivElement>(ref)}
        count={12}
        reactions={[{ value: "love", emoji: "❤️", label: "Love" }]}
      />
    ),
  },
  {
    name: "ResizablePanels",
    covers: ["ResizablePanels", "ResizablePanel", "ResizableHandle"],
    element: (ref) => (
      <ResizablePanels ref={asRef<HTMLDivElement>(ref)}>
        <ResizablePanel defaultSize={30}>Left</ResizablePanel>
        <ResizableHandle withGrip />
        <ResizablePanel>Right</ResizablePanel>
      </ResizablePanels>
    ),
  },
  {
    name: "SegmentedControl",
    covers: ["SegmentedControl", "SegmentedControlItem"],
    element: (ref) => (
      <SegmentedControl ref={asRef<HTMLDivElement>(ref)} aria-label="View">
        <SegmentedControlItem value="list">List</SegmentedControlItem>
        <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
      </SegmentedControl>
    ),
  },
  {
    name: "SegmentedControl with defaultValue",
    covers: ["SegmentedControl", "SegmentedControlItem"],
    element: (ref) => (
      <SegmentedControl ref={asRef<HTMLDivElement>(ref)} aria-label="View" defaultValue="grid" fullWidth>
        <SegmentedControlItem value="list">List</SegmentedControlItem>
        <SegmentedControlItem value="grid" icon={<span />}>
          Grid
        </SegmentedControlItem>
      </SegmentedControl>
    ),
  },
  {
    name: "Select",
    covers: ["Select", "SelectTrigger", "SelectContent", "SelectItem", "SelectGroup", "SelectLabel", "SelectSeparator"],
    element: (ref) => (
      <Select defaultValue="b">
        <SelectTrigger ref={asRef<HTMLButtonElement>(ref)} aria-label="Plan" />
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Plans</SelectLabel>
            <SelectItem value="a">Starter</SelectItem>
            <SelectItem value="b">Pro</SelectItem>
          </SelectGroup>
          <SelectSeparator />
        </SelectContent>
      </Select>
    ),
  },
  {
    name: "Slider",
    covers: ["Slider"],
    element: (ref) => (
      <Slider ref={asRef<HTMLDivElement>(ref)} aria-label="Volume" defaultValue={40} name="volume" showValue="always" />
    ),
  },
  {
    name: "RangeSlider",
    covers: ["RangeSlider"],
    element: (ref) => (
      <RangeSlider
        ref={asRef<HTMLDivElement>(ref)}
        aria-label="Price"
        defaultValue={[20, 80]}
        name="price"
        marks={[0, { value: 50, label: "50" }, 100]}
      />
    ),
  },
  {
    name: "SortableList",
    covers: ["SortableList", "SortableItem", "SortableHandle"],
    element: (ref) => (
      <SortableList ref={asRef<HTMLUListElement>(ref)} values={["a", "b"]} onValuesChange={() => {}} handle>
        {["a", "b"].map((v) => (
          <SortableItem key={v} value={v}>
            <SortableHandle />
            {v}
          </SortableItem>
        ))}
      </SortableList>
    ),
  },
  {
    name: "Switch",
    covers: ["Switch"],
    element: (ref) => <Switch ref={asRef<HTMLButtonElement>(ref)} aria-label="Wi-Fi" defaultChecked name="wifi" />,
  },
  {
    name: "Table",
    covers: ["Table", "TableHeader", "TableBody", "TableFooter", "TableRow", "TableHead", "TableCell", "TableCaption"],
    element: (ref) => (
      <Table ref={asRef<HTMLTableElement>(ref)}>
        <TableCaption>Caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead sortable sortDirection="asc">Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Ada</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>1</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    ),
  },
  {
    name: "Textarea",
    covers: ["Textarea"],
    element: (ref) => (
      <Textarea ref={asRef<HTMLTextAreaElement>(ref)} aria-label="Bio" autoResize showCount maxLength={120} />
    ),
  },
  {
    name: "ThemeSwitcher",
    covers: ["ThemeSwitcher"],
    element: (ref) => <ThemeSwitcher ref={asRef<HTMLDivElement>(ref)} storageKey={null} target={null} />,
  },
  // text
  {
    name: "CircularText",
    covers: ["CircularText"],
    element: (ref) => <CircularText ref={asRef<HTMLSpanElement>(ref)} text="Sample ring" />,
  },
  {
    name: "FancyUnderline",
    covers: ["FancyUnderline"],
    element: (ref) => <FancyUnderline ref={asRef<HTMLElement>(ref)} href="#sample">Sample</FancyUnderline>,
  },
  {
    name: "FlipCounter",
    covers: ["FlipCounter"],
    element: (ref) => <FlipCounter ref={asRef<HTMLSpanElement>(ref)} value="12:45" />,
  },
  {
    name: "GlitchText",
    covers: ["GlitchText"],
    element: (ref) => <GlitchText ref={asRef<HTMLElement>(ref)}>Sample</GlitchText>,
  },
  {
    name: "GradientText",
    covers: ["GradientText"],
    element: (ref) => (
      <GradientText ref={asRef<HTMLElement>(ref)} as="h2" angle={45}>
        Gradient
      </GradientText>
    ),
  },
  {
    name: "Highlighter",
    covers: ["Highlighter"],
    element: (ref) => <Highlighter ref={asRef<HTMLElement>(ref)}>important</Highlighter>,
  },
  {
    name: "Highlighter box",
    covers: ["Highlighter"],
    element: (ref) => (
      <Highlighter ref={asRef<HTMLElement>(ref)} variant="box" trigger="mount">
        boxed
      </Highlighter>
    ),
  },
  {
    name: "MorphingText",
    covers: ["MorphingText"],
    element: (ref) => <MorphingText ref={asRef<HTMLElement>(ref)} words={["Sample", "Words"]} />,
  },
  {
    name: "NumberTicker",
    covers: ["NumberTicker"],
    element: (ref) => <NumberTicker ref={asRef<HTMLElement>(ref)} value={1234.5} decimals={1} />,
  },
  {
    name: "RollingNumber",
    covers: ["RollingNumber"],
    element: (ref) => <RollingNumber ref={asRef<HTMLSpanElement>(ref)} value={1234.5} />,
  },
  {
    name: "ScrambleText",
    covers: ["ScrambleText"],
    element: (ref) => <ScrambleText ref={asRef<HTMLElement>(ref)} text="Hello world" trigger="hover" />,
  },
  {
    name: "ScrollTextReveal",
    covers: ["ScrollTextReveal"],
    element: (ref) => <ScrollTextReveal ref={asRef<HTMLElement>(ref)}>Sample</ScrollTextReveal>,
  },
  {
    name: "ScrollVelocityText",
    covers: ["ScrollVelocityText"],
    element: (ref) => <ScrollVelocityText ref={asRef<HTMLDivElement>(ref)} rows={["Sample row"]} />,
  },
  {
    name: "SparklesText",
    covers: ["SparklesText"],
    element: (ref) => <SparklesText ref={asRef<HTMLElement>(ref)}>Sample</SparklesText>,
  },
  {
    name: "SplitText",
    covers: ["SplitText"],
    element: (ref) => <SplitText ref={asRef<HTMLElement>(ref)}>Sample</SplitText>,
  },
  {
    name: "Terminal",
    covers: ["Terminal"],
    element: (ref) => (
      <Terminal ref={asRef<HTMLDivElement>(ref)} title="Sample" trigger="mount">
        <TerminalLine type="command">npm test</TerminalLine>
        <TerminalLine tone="success">ok</TerminalLine>
      </Terminal>
    ),
  },
  {
    name: "TextReveal",
    covers: ["TextReveal"],
    element: (ref) => (
      <TextReveal ref={asRef<HTMLElement>(ref)} split="char">
        Reveal me
      </TextReveal>
    ),
  },
  {
    name: "TextShimmer",
    covers: ["TextShimmer"],
    element: (ref) => <TextShimmer ref={asRef<HTMLElement>(ref)}>Generating</TextShimmer>,
  },
  {
    name: "TypingText",
    covers: ["TypingText"],
    element: (ref) => <TypingText ref={asRef<HTMLElement>(ref)} text={["Hello", "World"]} cursor="block" />,
  },
  {
    name: "VariableProximity",
    covers: ["VariableProximity"],
    element: (ref) => <VariableProximity ref={asRef<HTMLElement>(ref)}>Sample</VariableProximity>,
  },
  {
    name: "WavyText",
    covers: ["WavyText"],
    element: (ref) => <WavyText ref={asRef<HTMLElement>(ref)}>Sample</WavyText>,
  },
  {
    name: "WordRotate",
    covers: ["WordRotate"],
    element: (ref) => <WordRotate ref={asRef<HTMLElement>(ref)} words={["fast", "small"]} variant="flip" />,
  },
  // effects
  {
    name: "AnimatedBeam",
    covers: ["AnimatedBeam"],
    ref: false,
    element: (ref) => <BeamFixture beamRef={asRef<SVGSVGElement>(ref)} />,
  },
  {
    name: "AnimatedList",
    covers: ["AnimatedList"],
    element: (ref) => (
      <AnimatedList ref={asRef<HTMLDivElement>(ref)} label="Activity">
        <div key="a">First</div>
        <div key="b">Second</div>
      </AnimatedList>
    ),
  },
  {
    name: "BorderBeam",
    covers: ["BorderBeam"],
    element: (ref) => (
      <div className="relative rounded-xl">
        <BorderBeam ref={asRef<HTMLDivElement>(ref)} reverse />
      </div>
    ),
  },
  {
    name: "ClickSpark",
    covers: ["ClickSpark"],
    element: (ref) => <ClickSpark ref={asRef<HTMLDivElement>(ref)}>Sample</ClickSpark>,
  },
  {
    name: "Confetti",
    covers: ["Confetti"],
    element: (ref) => <Confetti ref={asRef<HTMLDivElement>(ref)}>Sample</Confetti>,
  },
  {
    name: "CursorTrail",
    covers: ["CursorTrail"],
    element: (ref) => <CursorTrail ref={asRef<HTMLDivElement>(ref)}>Sample</CursorTrail>,
  },
  {
    name: "DotGlobe",
    covers: ["DotGlobe"],
    element: (ref) => (
      <DotGlobe
        ref={asRef<HTMLDivElement>(ref)}
        label="Offices"
        markers={[{ lat: 51.5, lon: -0.1, label: "London" }]}
        arcs={[{ from: { lat: 51.5, lon: -0.1 }, to: { lat: 40.7, lon: -74 } }]}
      />
    ),
  },
  {
    name: "ExpandingCards",
    covers: ["ExpandingCards"],
    element: (ref) => (
      <ExpandingCards ref={asRef<HTMLDivElement>(ref)} items={[{ title: "One", content: "First" }, { title: "Two" }]} />
    ),
  },
  {
    name: "FlipCard",
    covers: ["FlipCard"],
    element: (ref) => <FlipCard ref={asRef<HTMLDivElement>(ref)}>Sample</FlipCard>,
  },
  {
    name: "GooeyButton",
    covers: ["GooeyButton"],
    element: (ref) => <GooeyButton ref={asRef<HTMLButtonElement>(ref)}>Sample</GooeyButton>,
  },
  {
    name: "HoloCard",
    covers: ["HoloCard"],
    element: (ref) => <HoloCard ref={asRef<HTMLDivElement>(ref)}>Sample</HoloCard>,
  },
  {
    name: "HorizontalScroll",
    covers: ["HorizontalScroll"],
    element: (ref) => (
      <HorizontalScroll ref={asRef<HTMLDivElement>(ref)}>
        <div>Panel one</div>
        <div>Panel two</div>
      </HorizontalScroll>
    ),
  },
  {
    name: "ImageTrail",
    covers: ["ImageTrail"],
    element: (ref) => (
      <ImageTrail ref={asRef<HTMLDivElement>(ref)} images={["data:image/gif;base64,R0lGODlhAQABAAAAACw="]}>
        Sample
      </ImageTrail>
    ),
  },
  {
    name: "Lens",
    covers: ["Lens"],
    element: (ref) => <Lens ref={asRef<HTMLDivElement>(ref)}>Sample</Lens>,
  },
  {
    name: "Magnetic",
    covers: ["Magnetic"],
    element: (ref) => (
      <Magnetic ref={asRef<HTMLSpanElement>(ref)}>
        <button type="button">Pull</button>
      </Magnetic>
    ),
  },
  {
    name: "Marquee",
    covers: ["Marquee"],
    element: (ref) => (
      <Marquee ref={asRef<HTMLDivElement>(ref)} repeat={2} direction="up">
        <span>One</span>
        <a href="#two">Two</a>
      </Marquee>
    ),
  },
  {
    name: "OrbitingCircles",
    covers: ["OrbitingCircles"],
    element: (ref) => (
      <OrbitingCircles ref={asRef<HTMLDivElement>(ref)} radius={60} reverse>
        <span>A</span>
        <span>B</span>
      </OrbitingCircles>
    ),
  },
  {
    name: "PageTransition",
    covers: ["PageTransition"],
    element: (ref) => <PageTransition ref={asRef<HTMLDivElement>(ref)} routeKey="/">Sample</PageTransition>,
  },
  {
    name: "Parallax",
    covers: ["Parallax", "ParallaxLayer"],
    element: (ref) => (
      <Parallax ref={asRef<HTMLDivElement>(ref)}>
        <ParallaxLayer speed={0.3}>Sample</ParallaxLayer>
      </Parallax>
    ),
  },
  {
    name: "PixelReveal",
    covers: ["PixelReveal"],
    element: (ref) => <PixelReveal ref={asRef<HTMLDivElement>(ref)}>Sample</PixelReveal>,
  },
  {
    name: "ProximityGlow",
    covers: ["ProximityGlow"],
    element: (ref) => <ProximityGlow ref={asRef<HTMLDivElement>(ref)}>Sample</ProximityGlow>,
  },
  {
    name: "Reveal",
    covers: ["Reveal"],
    element: (ref) => (
      <Reveal ref={asRef<HTMLElement>(ref)} preset="blur" as="section">
        Content
      </Reveal>
    ),
  },
  {
    name: "ScrollProgress",
    covers: ["ScrollProgress"],
    element: (ref) => <ScrollProgress ref={asRef<HTMLDivElement>(ref)} position="bottom" fixed={false} />,
  },
  {
    name: "ScrollStack",
    covers: ["ScrollStack", "ScrollStackItem"],
    element: (ref) => (
      <ScrollStack ref={asRef<HTMLDivElement>(ref)}>
        <ScrollStackItem>One</ScrollStackItem>
        <ScrollStackItem>Two</ScrollStackItem>
      </ScrollStack>
    ),
  },
  {
    name: "ShineBorder",
    covers: ["ShineBorder"],
    element: (ref) => (
      <div className="relative rounded-xl">
        <ShineBorder ref={asRef<HTMLDivElement>(ref)} borderWidth={2} />
      </div>
    ),
  },
  {
    name: "SmoothCursor",
    covers: ["SmoothCursor"],
    // Inactive in jsdom (no fine pointer): renders null, so the ref stays null (design 7.3 #52).
    element: (ref) => (
      <div>
        <SmoothCursor ref={asRef<HTMLDivElement>(ref)} />
      </div>
    ),
    ref: false,
  },
  {
    name: "SpotlightCard",
    covers: ["SpotlightCard"],
    element: (ref) => <SpotlightCard ref={asRef<HTMLDivElement>(ref)}>Card</SpotlightCard>,
  },
  {
    name: "Stagger",
    covers: ["Stagger", "StaggerItem"],
    element: (ref) => (
      <Stagger ref={asRef<HTMLElement>(ref)} preset="scale">
        <StaggerItem>a</StaggerItem>
        <StaggerItem as="article" preset="fade-left">
          b
        </StaggerItem>
      </Stagger>
    ),
  },
  {
    name: "Stagger as list",
    covers: ["Stagger", "StaggerItem"],
    element: (ref) => (
      <Stagger ref={asRef<HTMLElement>(ref)} as="ul">
        <StaggerItem as="li">a</StaggerItem>
      </Stagger>
    ),
  },
  {
    name: "StickerPeel",
    covers: ["StickerPeel"],
    element: (ref) => <StickerPeel ref={asRef<HTMLDivElement>(ref)}>Sample</StickerPeel>,
  },
  {
    name: "StickyReveal",
    covers: ["StickyReveal"],
    element: (ref) => (
      <StickyReveal ref={asRef<HTMLDivElement>(ref)} items={[{ title: "One", body: "First", media: <span>Media</span> }]} />
    ),
  },
  {
    name: "TiltCard",
    covers: ["TiltCard"],
    element: (ref) => <TiltCard ref={asRef<HTMLDivElement>(ref)}>Tilt</TiltCard>,
  },
  {
    name: "ZoomParallax",
    covers: ["ZoomParallax"],
    element: (ref) => (
      <ZoomParallax ref={asRef<HTMLDivElement>(ref)} images={[{ src: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", alt: "Pixel" }]} />
    ),
  },
  // backgrounds
  {
    name: "AuroraBackground",
    covers: ["AuroraBackground"],
    element: (ref) => <AuroraBackground ref={asRef<HTMLDivElement>(ref)} intensity="vivid" />,
  },
  {
    name: "Beams",
    covers: ["Beams"],
    element: (ref) => <Beams ref={asRef<HTMLDivElement>(ref)} />,
  },
  {
    name: "DotField",
    covers: ["DotField"],
    element: (ref) => <DotField ref={asRef<HTMLDivElement>(ref)} />,
  },
  {
    name: "DotPattern",
    covers: ["DotPattern"],
    element: (ref) => <DotPattern ref={asRef<SVGSVGElement>(ref)} mask="fade-x" />,
  },
  {
    name: "FlickeringGrid",
    covers: ["FlickeringGrid"],
    element: (ref) => <FlickeringGrid ref={asRef<HTMLDivElement>(ref)} />,
  },
  {
    name: "FlowField",
    covers: ["FlowField"],
    element: (ref) => <FlowField ref={asRef<HTMLDivElement>(ref)} />,
  },
  {
    name: "GradientMesh",
    covers: ["GradientMesh"],
    element: (ref) => <GradientMesh ref={asRef<HTMLDivElement>(ref)} />,
  },
  {
    name: "GridPattern",
    covers: ["GridPattern"],
    element: (ref) => (
      <GridPattern
        ref={asRef<SVGSVGElement>(ref)}
        squares={[
          [1, 1],
          [2, 3],
        ]}
        strokeDasharray="4 2"
      />
    ),
  },
  {
    name: "Halftone",
    covers: ["Halftone"],
    element: (ref) => <Halftone ref={asRef<HTMLDivElement>(ref)} />,
  },
  {
    name: "LavaLamp",
    covers: ["LavaLamp"],
    element: (ref) => <LavaLamp ref={asRef<HTMLDivElement>(ref)} />,
  },
  {
    name: "LightRays",
    covers: ["LightRays"],
    element: (ref) => <LightRays ref={asRef<HTMLDivElement>(ref)} />,
  },
  {
    name: "MatrixRain",
    covers: ["MatrixRain"],
    element: (ref) => <MatrixRain ref={asRef<HTMLDivElement>(ref)} />,
  },
  {
    name: "Meteors",
    covers: ["Meteors"],
    element: (ref) => <Meteors ref={asRef<HTMLDivElement>(ref)} count={5} />,
  },
  {
    name: "NoiseOverlay",
    covers: ["NoiseOverlay"],
    element: (ref) => <NoiseOverlay ref={asRef<HTMLDivElement>(ref)} />,
  },
  {
    name: "Particles",
    covers: ["Particles"],
    element: (ref) => <Particles ref={asRef<HTMLDivElement>(ref)} quantity={10} />,
  },
  {
    name: "RetroGrid",
    covers: ["RetroGrid"],
    element: (ref) => <RetroGrid ref={asRef<HTMLDivElement>(ref)} />,
  },
  {
    name: "Ripple",
    covers: ["Ripple"],
    element: (ref) => <Ripple ref={asRef<HTMLDivElement>(ref)} count={3} />,
  },
  {
    name: "Starfield",
    covers: ["Starfield"],
    element: (ref) => <Starfield ref={asRef<HTMLDivElement>(ref)} />,
  },
  {
    name: "Topography",
    covers: ["Topography"],
    element: (ref) => <Topography ref={asRef<HTMLDivElement>(ref)} />,
  },
  {
    name: "Waves",
    covers: ["Waves"],
    element: (ref) => <Waves ref={asRef<HTMLDivElement>(ref)} />,
  },
  {
    name: "AreaChart",
    covers: ["AreaChart"],
    element: (ref) => <AreaChart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} x="m" series={[{ id: "a", y: "a" }, { id: "b", y: "b" }]} stack="stack" />,
  },
  {
    name: "BarChart",
    covers: ["BarChart"],
    element: (ref) => <BarChart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} x="m" series={[{ id: "a", y: "a" }]} />,
  },
  {
    name: "BarList",
    covers: ["BarList"],
    element: (ref) => <BarList ref={asRef<HTMLDivElement>(ref)} items={[{ label: "/home", value: 420 }, { label: "/pricing", value: 210 }]} />,
  },
  {
    name: "BarRace",
    covers: ["BarRace"],
    element: (ref) => <BarRace ref={asRef<HTMLElement>(ref)} frames={[{ time: 2024, values: { a: 3, b: 5 } }, { time: 2025, values: { a: 6, b: 4 } }]} />,
  },
  {
    name: "BeeswarmChart",
    covers: ["BeeswarmChart"],
    element: (ref) => <BeeswarmChart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} value="a" />,
  },
  {
    name: "BoxPlot",
    covers: ["BoxPlot"],
    element: (ref) => <BoxPlot ref={asRef<HTMLElement>(ref)} data={[{ g: "A", v: 3 }, { g: "A", v: 5 }, { g: "B", v: 8 }, { g: "B", v: 6 }]} group="g" value="v" />,
  },
  {
    name: "BumpChart",
    covers: ["BumpChart"],
    element: (ref) => <BumpChart ref={asRef<HTMLElement>(ref)} data={[{ p: 2024, t: "A", v: 3 }, { p: 2024, t: "B", v: 5 }, { p: 2025, t: "A", v: 6 }, { p: 2025, t: "B", v: 4 }]} x="p" series="t" value="v" />,
  },
  {
    name: "CalendarHeatmap",
    covers: ["CalendarHeatmap"],
    element: (ref) => <CalendarHeatmap ref={asRef<HTMLElement>(ref)} data={[{ d: "2026-01-02", c: 3 }, { d: "2026-01-05", c: 8 }]} date="d" value="c" />,
  },
  {
    name: "CandlestickChart",
    covers: ["CandlestickChart"],
    element: (ref) => <CandlestickChart ref={asRef<HTMLElement>(ref)} data={[{ t: "2026-01-02", o: 10, h: 12, l: 9, c: 11 }, { t: "2026-01-05", o: 11, h: 13, l: 10, c: 10.5 }]} x="t" open="o" high="h" low="l" close="c" />,
  },
  {
    name: "Chart",
    covers: ["Chart"],
    element: (ref) => <Chart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} x="m"><LineSeries id="a" y="a" /></Chart>,
  },
  {
    name: "ChartExport",
    covers: ["ChartExport"],
    element: (ref) => <ChartExport ref={asRef<HTMLDivElement>(ref)}><svg viewBox="0 0 10 10" /></ChartExport>,
  },
  {
    name: "ChartInsights",
    covers: ["ChartInsights", "InsightList", "ChartSummary"],
    element: (ref) => (
      <Chart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} x={(_, i) => i}>
        <LineSeries id="a" y="a" />
        <ChartInsights list="bottom" />
        <InsightList position="top" />
        <ChartSummary />
      </Chart>
    ),
  },
  {
    name: "ChartSonify",
    covers: ["ChartSonify"],
    element: (ref) => (
      <Chart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} x={(_, i) => i}>
        <LineSeries id="a" y="a" />
        <ChartSonify />
      </Chart>
    ),
  },
  {
    name: "ChartZoom",
    covers: ["ChartZoom"],
    element: (ref) => (
      <Chart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} x={(_, i) => i}>
        <LineSeries id="a" y="a" />
        <ChartZoom />
      </Chart>
    ),
  },
  {
    name: "ComboChart",
    covers: ["ComboChart"],
    element: (ref) => <ComboChart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} x="m" series={[{ id: "a", type: "bar", y: "a" }]} />,
  },
  {
    name: "DiffChart",
    covers: ["DiffChart"],
    element: (ref) => <DiffChart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} x={(_, i) => i} a="a" b="b" />,
  },
  {
    name: "DumbbellChart",
    covers: ["DumbbellChart"],
    element: (ref) => <DumbbellChart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} label="m" start="b" end="a" />,
  },
  {
    name: "FunnelChart",
    covers: ["FunnelChart"],
    element: (ref) => <FunnelChart ref={asRef<HTMLElement>(ref)} steps={[{ label: "Visit", value: 100 }, { label: "Paid", value: 20 }]} />,
  },
  {
    name: "GanttChart",
    covers: ["GanttChart"],
    element: (ref) => <GanttChart ref={asRef<HTMLElement>(ref)} tasks={[{ id: "a", name: "Design", start: "2026-01-05", end: "2026-01-09" }, { id: "b", name: "Build", start: "2026-01-12", end: "2026-01-23", dependsOn: ["a"] }]} />,
  },
  {
    name: "GaugeChart",
    covers: ["GaugeChart"],
    element: (ref) => <GaugeChart ref={asRef<HTMLDivElement>(ref)} value={62} />,
  },
  {
    name: "HeatmapChart",
    covers: ["HeatmapChart"],
    element: (ref) => <HeatmapChart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} x="m" y={() => "a"} value="a" />,
  },
  {
    name: "HistogramChart",
    covers: ["HistogramChart"],
    element: (ref) => <HistogramChart ref={asRef<HTMLElement>(ref)} values={[3, 5, 4, 8, 6, 9]} />,
  },
  {
    name: "LineChart",
    covers: ["LineChart"],
    element: (ref) => <LineChart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} x="m" series={[{ id: "a", y: "a" }]} />,
  },
  {
    name: "LiveChart",
    covers: ["LiveChart"],
    element: (ref) => <LiveChart ref={asRef<HTMLElement>(ref)} data={[{ t: 0, value: 3 }, { t: 1000, value: 5 }, { t: 2000, value: 4 }]} />,
  },
  {
    name: "MorphChart",
    covers: ["MorphChart"],
    element: (ref) => <MorphChart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} label="m" value="a" />,
  },
  {
    name: "NetworkGraph",
    covers: ["NetworkGraph"],
    element: (ref) => <NetworkGraph ref={asRef<HTMLElement>(ref)} nodes={[{ id: "a" }, { id: "b" }, { id: "c" }]} links={[{ source: "a", target: "b" }, { source: "b", target: "c" }]} />,
  },
  {
    name: "ParallelCoordinates",
    covers: ["ParallelCoordinates"],
    element: (ref) => <ParallelCoordinates ref={asRef<HTMLElement>(ref)} data={[{ a: 1, b: 4 }, { a: 3, b: 2 }]} dimensions={[{ key: "a" }, { key: "b" }]} />,
  },
  {
    name: "PieChart",
    covers: ["PieChart"],
    element: (ref) => <PieChart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} value="a" label="m" />,
  },
  {
    name: "RadarChart",
    covers: ["RadarChart"],
    element: (ref) => <RadarChart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} axis="m" series={[{ id: "a", value: "a" }]} />,
  },
  {
    name: "RidgelineChart",
    covers: ["RidgelineChart"],
    element: (ref) => <RidgelineChart ref={asRef<HTMLElement>(ref)} data={[{ g: "A", v: 3 }, { g: "A", v: 5 }, { g: "B", v: 8 }, { g: "B", v: 6 }]} group="g" value="v" />,
  },
  {
    name: "SankeyChart",
    covers: ["SankeyChart"],
    element: (ref) => <SankeyChart ref={asRef<HTMLElement>(ref)} nodes={[{ id: "a" }, { id: "b" }, { id: "c" }]} links={[{ source: "a", target: "b", value: 3 }, { source: "a", target: "c", value: 2 }]} />,
  },
  {
    name: "ScatterChart",
    covers: ["ScatterChart"],
    element: (ref) => <ScatterChart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} x={(_, i) => i} y="a" />,
  },
  {
    name: "ScrollyChart",
    covers: ["ScrollyChart"],
    element: (ref) => <ScrollyChart ref={asRef<HTMLElement>(ref)} steps={[{ id: "a", content: "One", state: 1 }, { id: "b", content: "Two", state: 2 }]} render={(state) => <p>{state}</p>} />,
  },
  {
    name: "SlopeChart",
    covers: ["SlopeChart"],
    element: (ref) => <SlopeChart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} label="m" from="b" to="a" />,
  },
  {
    name: "SmallMultiples",
    covers: ["SmallMultiples"],
    element: (ref) => <SmallMultiples ref={asRef<HTMLElement>(ref)} data={[{ g: "A", t: 0, v: 3 }, { g: "A", t: 1, v: 5 }, { g: "B", t: 0, v: 4 }, { g: "B", t: 1, v: 8 }]} facet="g" x="t" y="v" />,
  },
  {
    name: "Sparkline",
    covers: ["Sparkline"],
    element: (ref) => <Sparkline ref={asRef<HTMLElement>(ref)} data={[3, 5, 4, 8]} />,
  },
  {
    name: "StatCard",
    covers: ["StatCard"],
    element: (ref) => <StatCard ref={asRef<HTMLElement>(ref)} label="Revenue" value={42} trend={[3, 5, 4, 8]} />,
  },
  {
    name: "StatusTracker",
    covers: ["StatusTracker"],
    element: (ref) => <StatusTracker ref={asRef<HTMLElement>(ref)} items={[{ date: "2026-01-01", status: "up" }, { date: "2026-01-02", status: "down" }]} />,
  },
  {
    name: "StreamChart",
    covers: ["StreamChart"],
    element: (ref) => <StreamChart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} x="m" series={["a", "b"]} />,
  },
  {
    name: "SunburstChart",
    covers: ["SunburstChart"],
    element: (ref) => <SunburstChart ref={asRef<HTMLElement>(ref)} data={TREE_ROWS} value="v" label="l" />,
  },
  {
    name: "TreemapChart",
    covers: ["TreemapChart"],
    element: (ref) => <TreemapChart ref={asRef<HTMLElement>(ref)} data={TREE_ROWS} value="v" label="l" />,
  },
  {
    name: "WaterfallChart",
    covers: ["WaterfallChart"],
    element: (ref) => <WaterfallChart ref={asRef<HTMLElement>(ref)} data={[{ l: "Start", v: 10 }, { l: "Sales", v: 4 }]} label="l" value="v" />,
  },
  {
    name: "WhatIfChart",
    covers: ["WhatIfChart"],
    element: (ref) => <WhatIfChart ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} x="m" y="a" editableFrom={2} />,
  },
  {
    name: "YouDrawIt",
    covers: ["YouDrawIt"],
    element: (ref) => <YouDrawIt ref={asRef<HTMLElement>(ref)} data={CHART_ROWS} x="m" y="a" revealFrom={2} />,
  },
];

/** Widget fixtures whose server HTML must contain exactly one tabindex="0" (design 11.2 ssr row). */
export const singleTabStopFixtures = [
  "Dock",
  "RadioGroup",
  "RadioGroup with defaultValue",
  "SegmentedControl",
  "SegmentedControl with defaultValue",
  "Tabs",
  "Tabs with defaultValue",
];

/**
 * One probe per public hook export (keyed by export name). smoke.test.tsx calls each probe inside a
 * component, so hooks run with real React rendering in both themes.
 */
export const hookProbes: Record<string, () => unknown> = {
  useClickOutside: () => {
    const ref = useRef<HTMLElement>(null);
    useClickOutside(ref, () => {});
    return ref;
  },
  useControllableState: () => useControllableState({ defaultValue: 1 }),
  useCopyToClipboard: () => useCopyToClipboard(),
  useElementSize: () => {
    const ref = useRef<HTMLElement>(null);
    return useElementSize(ref);
  },
  useFocusTrap: () => {
    const ref = useRef<HTMLElement>(null);
    useFocusTrap(ref);
    return ref;
  },
  useMediaQuery: () => useMediaQuery("(min-width: 640px)"),
  useMousePosition: () => useMousePosition(),
  usePointerProximity: () => {
    const ref = useRef<HTMLElement>(null);
    return usePointerProximity(ref);
  },
  usePrefersReducedMotion: () => usePrefersReducedMotion(),
  useScrollDirection: () => useScrollDirection(),
  useScrollVelocity: () => useScrollVelocity(),
  useToast: () => useToast(),
  useViewTransition: () => useViewTransition(),
};

import "./app.css";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Slider,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toaster,
  toast,
} from "changelui";
import { Button as SubpathButton } from "changelui/button";
import { cn } from "changelui/cn";
import { Switch as SubpathSwitch } from "changelui/switch";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";

// The design 12.4 page. Keep it identical to test/consumers/react18-css/src/main.tsx.
const stack = { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, padding: 24 } as const;

function App() {
  useEffect(() => {
    // A fixed id keeps StrictMode's double effect run from adding a second toast.
    toast({ id: "welcome", title: "Welcome", description: "Rendered from the packed tarball.", durationMs: Infinity });
  }, []);
  return (
    <main
      className={cn("consumer-page", ["consumer-root"])}
      style={stack}
      data-testid="page"
      data-subpath-identity={String(SubpathButton === Button && SubpathSwitch === Switch)}
    >
      <div style={{ display: "flex", gap: 12 }}>
        <Button data-testid="solid-button">Solid</Button>
        <Button variant="ghost" data-testid="ghost-button">
          Ghost
        </Button>
      </div>
      <Switch aria-label="Notifications" data-testid="switch" />
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" data-testid="dialog-trigger">
            Open dialog
          </Button>
        </DialogTrigger>
        <DialogContent data-testid="dialog">
          <DialogTitle data-testid="dialog-title">Consumer dialog</DialogTitle>
          <DialogDescription>Escape closes this dialog.</DialogDescription>
        </DialogContent>
      </Dialog>
      <div style={{ width: 240 }}>
        <Slider aria-label="Volume" size="md" defaultValue={40} data-testid="slider" />
      </div>
      <div style={{ width: 320 }} data-testid="tabs-box">
        <Tabs defaultValue="one">
          <TabsList variant="pill" fullWidth aria-label="Sections" data-testid="tabs-list">
            <TabsTrigger value="one">Overview</TabsTrigger>
            <TabsTrigger value="two">Usage</TabsTrigger>
            <TabsTrigger value="three">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="one">Overview panel</TabsContent>
          <TabsContent value="two">Usage panel</TabsContent>
          <TabsContent value="three">Settings panel</TabsContent>
        </Tabs>
      </div>
      <Toaster data-testid="toaster" />
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

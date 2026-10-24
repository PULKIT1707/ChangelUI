import { Toaster } from "changelui";
import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./index.css";
import { analytics } from "./lib/analytics/client";
import { useRoute } from "./router";

/** The Toast page renders its own configurable Toaster; a second one would show every toast twice. */
function AppToaster() {
  const route = useRoute();
  return route.kind === "item" && route.slug === "toast" ? null : <Toaster />;
}

// Consent-gated and lazy: a no-op without VITE_POSTHOG_KEY (posthog-js is never fetched).
void analytics.init();

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <MotionConfig reducedMotion="user">
        {/* The sentinel utility must never reach dist/styles.css (check-dist, design 12.3). */}
        <div className="[--pui-dashboard-sentinel:1] min-h-dvh bg-pui-background text-pui-foreground">
          <App />
        </div>
        <AppToaster />
      </MotionConfig>
    </StrictMode>,
  );
}

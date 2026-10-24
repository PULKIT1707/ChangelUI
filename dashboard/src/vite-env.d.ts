/// <reference types="vite/client" />

// Build-time dashboard env (dashboard/.env.local, see dashboard/.env.example). Both are optional:
// without VITE_POSTHOG_KEY the analytics client is a no-op and posthog-js is never loaded.
interface ImportMetaEnv {
  /** PostHog public project API key (phc_...). Public by design: it ships in the bundle. */
  readonly VITE_POSTHOG_KEY?: string;
  /** PostHog ingestion host, https only. Defaults to https://eu.i.posthog.com. */
  readonly VITE_POSTHOG_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

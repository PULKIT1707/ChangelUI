import { Alert } from "changelui";
import { PrivacySettings } from "../components/privacy-settings";
import { CONSENT_STORAGE_KEY } from "../lib/analytics/consent";
import { NOT_FOUND_PATH_MAX, ZERO_RESULT_QUERY_MAX } from "../lib/analytics/events";
import { DocSection, Prose } from "./installation";

const linkClass =
  "rounded-pui-sm text-pui-foreground underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pui-ring";

/** What the dashboard's analytics collects per tier, and the live choice (plan decision 12). */
export function Privacy() {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-3">
        <h1 tabIndex={-1} className="text-3xl font-bold tracking-tight outline-none sm:text-4xl">
          Privacy
        </h1>
        <p className="text-base text-pui-muted-foreground">
          What this site's analytics collects, what it never collects, and how to change your choice.
        </p>
      </header>

      <Alert tone="warning" title="Not legal advice">
        This page is a plain description written by the site owner. It is not legal advice, it does not claim compliance
        with any law, and it should be reviewed by a qualified person before you rely on it.
      </Alert>

      <DocSection id="always" title="Collected without consent">
        <Prose>
          <p>Unless your browser sends a privacy signal (below), these anonymous statistics are always sent:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Page views, with the route and its category (for example a component page under Components).</li>
            <li>
              How the docs are used: opening the command palette and picking a result, search length and how many results
              a search found, copying code or the install command, changing or resetting demo controls, and switching the
              theme or theme preset. On Developer&apos;s Pick: which pick was opened (its slug, category, position in the
              list, whether it was featured and whether it was on the home page or the picks page), the category filter
              chosen, and which item Surprise me opened.
            </li>
            <li>
              Page load speed (Web Vitals and time to first byte). This includes the CSS selector of the largest element
              shown while the page loads and of the element behind a slow click or key press, and, when that largest element
              is an image, the image address without its query string.
            </li>
            <li>Errors thrown by component demos, and visits to pages that do not exist.</li>
            <li>
              The search text, only when a palette search found nothing: trimmed, lowercased and at most{" "}
              {ZERO_RESULT_QUERY_MAX} characters.
            </li>
            <li>
              The cleaned-up path of a page that does not exist: no query string, lowercased, only letters, digits and{" "}
              <code>/ . _ -</code>, at most {NOT_FOUND_PATH_MAX} characters.
            </li>
            <li>
              Your consent choice itself (accepted, declined or withdrawn, and whether you made it in the banner or in the
              settings), to measure how often visitors accept.
            </li>
            <li>The site you came from, cut to its origin (for example https://example.com), never the full address.</li>
            <li>A screen-size bucket (mobile, tablet or desktop) and whether the light or dark theme is on.</li>
            <li>
              Standard device details that PostHog adds to every event: browser and operating system (name and version,
              read from the user agent), device type, browser language, time zone, the exact screen and window size, and
              the page title, plus technical details such as the analytics library version and the time of the event.
            </li>
          </ul>
          <p>
            This tier sets no cookies and keeps no analytics identifier in local or session storage. There are no person
            profiles, no session replay, no heatmaps and no automatic click capture. Query strings are removed from URLs
            before anything is sent. Visits are counted with a server-side hash that rotates daily, so they cannot be
            linked across days.
          </p>
          <p>
            Like any web server, PostHog receives your IP address with each request. This site's PostHog project is set
            to discard it, and PostHog uses request data such as the IP address and user agent to compute the daily hash.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="with-consent" title="Collected only if you accept">
        <Prose>
          <ul className="list-disc space-y-1 pl-5">
            <li>A random anonymous id, kept in this browser's localStorage, so repeat visits can be recognized.</li>
            <li>Automatic capture of clicks, with element text masked.</li>
            <li>Heatmaps, scroll depth, and rage or dead clicks (repeated clicks, or clicks that do nothing).</li>
            <li>Session replay, with every input and all page text masked.</li>
          </ul>
        </Prose>
      </DocSection>

      <DocSection id="never" title="Never collected">
        <Prose>
          <p>
            Names, email addresses and form input are never collected, except the palette search text described above
            when a search finds nothing. The site never identifies you:
            there are no identify calls, in any tier.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="processor" title="Processor">
        <Prose>
          <p>
            Analytics runs on PostHog, in its EU Cloud (Frankfurt) region. PostHog describes its own handling in the{" "}
            <a className={linkClass} href="https://posthog.com/privacy" target="_blank" rel="noreferrer">
              PostHog privacy policy
            </a>
            .
          </p>
        </Prose>
      </DocSection>

      <DocSection id="retention" title="Retention">
        <Prose>
          <p>
            How long data is kept is governed by the retention setting of this site's PostHog project. [Site owner: state
            the retention period for events and session replays here.]
          </p>
        </Prose>
      </DocSection>

      <DocSection id="privacy-signals" title="Do Not Track and Global Privacy Control">
        <Prose>
          <p>
            If your browser sends Do Not Track or Global Privacy Control, it counts as a refusal: nothing is sent and the
            banner is not shown. You can still opt in with the settings below.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="storage" title="What is stored in your browser">
        <Prose>
          <p>
            One localStorage key, <code>{CONSENT_STORAGE_KEY}</code>, holds your choice and the date you made it. It is
            written only when you choose, and it is strictly necessary: without it the site could not remember your answer
            and would ask again on every visit.
          </p>
        </Prose>
      </DocSection>

      <DocSection id="withdraw" title="How to withdraw">
        <Prose>
          <p>
            Use the settings below at any time. A change applies immediately, without a reload, and withdrawing deletes the
            analytics identifiers stored in this browser.
          </p>
        </Prose>
      </DocSection>

      <section id="privacy-settings" aria-labelledby="privacy-settings-heading" className="flex scroll-mt-20 flex-col gap-3">
        <h2 id="privacy-settings-heading" className="text-xl font-semibold tracking-tight">
          Your privacy settings
        </h2>
        <PrivacySettings />
      </section>
    </article>
  );
}

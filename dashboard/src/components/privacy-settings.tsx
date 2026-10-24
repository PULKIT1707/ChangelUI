import { Button } from "changelui";
import { analytics as defaultAnalytics, type Analytics } from "../lib/analytics/client";
import { useConsent, type ConsentStatus } from "../lib/analytics/consent";

const STATUS_LABELS: Record<ConsentStatus, string> = {
  pending: "Not chosen",
  accepted: "Allowed",
  declined: "Declined",
  suppressed: "Browser privacy signal detected",
};

const STATUS_DETAILS: Record<ConsentStatus, string> = {
  pending: "Anonymous, cookieless statistics are on. Session replay and heatmaps stay off until you accept.",
  accepted: "Full analytics is on: a random anonymous id in this browser, masked session replay and heatmaps.",
  declined: "Only anonymous, cookieless statistics are sent, and no analytics identifier is kept in this browser.",
  suppressed: "Your browser sends Do Not Track or Global Privacy Control, so nothing is sent. You can still opt in.",
};

export interface PrivacySettingsProps {
  /** The analytics client (tests inject a configured one); defaults to the dashboard singleton. */
  client?: Analytics;
}

/**
 * Live analytics choice for the privacy page (plan decision 12): the current status in a polite
 * live region, and Accept / Decline (Withdraw once accepted). The first button keeps its DOM node
 * across Accept <-> Withdraw, so keyboard focus stays put after a choice.
 */
export function PrivacySettings({ client = defaultAnalytics }: PrivacySettingsProps) {
  const state = useConsent(client.consent);

  if (!state.configured) {
    return (
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-pui-muted-foreground">
        <p role="status" className="font-medium text-pui-foreground">
          Status: Analytics not enabled in this build
        </p>
        <p>This copy of the site was built without an analytics key, so nothing is collected and there is nothing to choose.</p>
      </div>
    );
  }

  const accepted = state.status === "accepted";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-sm leading-relaxed">
        <p role="status" className="font-medium text-pui-foreground">
          Status: {STATUS_LABELS[state.status]}
        </p>
        <p className="text-pui-muted-foreground">{STATUS_DETAILS[state.status]}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          key="primary"
          variant="outline"
          tone="neutral"
          size="md"
          onClick={() => (accepted ? client.withdraw("settings") : client.accept("settings"))}
        >
          {accepted ? "Withdraw consent" : "Accept full analytics"}
        </Button>
        {accepted ? null : (
          <Button key="decline" variant="outline" tone="neutral" size="md" onClick={() => client.decline("settings")}>
            Decline
          </Button>
        )}
      </div>
    </div>
  );
}

import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OnboardingChecklist, type OnboardingStep } from "../../src/components/onboarding-checklist";
const steps: OnboardingStep[] = [
  { id: "profile", title: "Complete your profile", done: true },
  { id: "invite", title: "Invite a teammate", description: "Work goes faster together." },
  { id: "connect", title: "Connect a repo", description: "Import your code." },
];
describe("OnboardingChecklist", () => {
  it("renders a labelled section with progress, merges className and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    render(<OnboardingChecklist ref={ref} className="mt-4" steps={steps} />);
    const section = screen.getByRole("region", { name: "Get started" });
    expect(ref.current).toBe(section);
    expect(section.className).toContain("mt-4");
    expect(screen.getByRole("progressbar", { name: "1 of 3 steps complete" })).toHaveAttribute("aria-valuenow", "1");
  });
  it("opens the first unfinished step and lets another expand (a11y)", () => {
    render(<OnboardingChecklist steps={steps} />);
    expect(screen.getByRole("button", { name: /Invite a teammate/ })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: /Connect a repo/ }));
    expect(screen.getByRole("button", { name: /Connect a repo/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Invite a teammate/ })).toHaveAttribute("aria-expanded", "false");
  });
  it("toggles steps through checkboxes", () => {
    const onStepToggle = vi.fn();
    render(<OnboardingChecklist steps={steps} onStepToggle={onStepToggle} />);
    const box = screen.getByRole("checkbox", { name: "Invite a teammate" });
    expect(box).toHaveAttribute("aria-checked", "false");
    fireEvent.click(box);
    expect(onStepToggle).toHaveBeenCalledWith("invite", true);
  });
  it("celebrates when everything is done and can be dismissed", () => {
    const onDismiss = vi.fn();
    render(<OnboardingChecklist steps={steps.map((s) => ({ ...s, done: true }))} onDismiss={onDismiss} />);
    expect(screen.getByText("You're all set")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close checklist" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
  it("renders on the server", () => {
    expect(renderToString(<OnboardingChecklist title="Server" steps={steps} />)).toContain("Server");
  });
});

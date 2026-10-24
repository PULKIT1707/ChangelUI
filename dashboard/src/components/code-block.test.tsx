import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { analytics } from "../lib/analytics/client";
import { INSTALL_COMMAND } from "../lib/nav";
import { CodeBlock } from "./code-block";

describe("CodeBlock analytics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tracks code_copied with the snippet kind, surface and component", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    const track = vi.spyOn(analytics, "track");
    render(<CodeBlock code="<Button />" copyLabel="Copy snippet" analytics={{ snippet: "usage", surface: "item_page", component: "button" }} />);
    await user.click(screen.getByRole("button", { name: "Copy snippet" }));
    await waitFor(() => expect(track).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith("<Button />");
    expect(track).toHaveBeenCalledWith("code_copied", { component: "button", snippet_kind: "usage", surface: "item_page" });
  });

  it("tracks the install command as install_command_copied", async () => {
    const user = userEvent.setup();
    const track = vi.spyOn(analytics, "track");
    render(<CodeBlock code={INSTALL_COMMAND} copyLabel="Copy install command" analytics={{ snippet: "install", surface: "installation" }} />);
    await user.click(screen.getByRole("button", { name: "Copy install command" }));
    await waitFor(() => expect(track).toHaveBeenCalledTimes(1));
    expect(track).toHaveBeenCalledWith("install_command_copied", { surface: "installation" });
  });

  it("tracks nothing without the analytics prop", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    const track = vi.spyOn(analytics, "track");
    render(<CodeBlock code={INSTALL_COMMAND} copyLabel="Copy install command" />);
    await user.click(screen.getByRole("button", { name: "Copy install command" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(INSTALL_COMMAND));
    await waitFor(() => expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument());
    expect(track).not.toHaveBeenCalled();
  });
});

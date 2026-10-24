import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StatusButton } from "../../src/components/status-button";
describe("StatusButton", () => {
  it("renders a button, merges className and forwards the ref", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <StatusButton ref={ref} className="mt-4">
        Save
      </StatusButton>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute("data-status", "idle");
    expect(button.className).toContain("mt-4");
  });
  it("walks pending -> success, ignores clicks while pending and announces the result (a11y)", async () => {
    let resolve: (v: string) => void = () => {};
    const action = vi.fn(() => new Promise<string>((r) => (resolve = r)));
    const onSuccess = vi.fn();
    render(
      <StatusButton action={action} onSuccess={onSuccess} successLabel="Saved" resetAfter={0}>
        Save
      </StatusButton>,
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(button).toHaveAttribute("data-status", "pending");
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.click(button);
    expect(action).toHaveBeenCalledTimes(1);
    await act(async () => resolve("ok"));
    expect(button).toHaveAttribute("data-status", "success");
    expect(onSuccess).toHaveBeenCalledWith("ok");
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(button).toHaveAccessibleName("Saved");
  });
  it("shows the error state when the action rejects", async () => {
    const onError = vi.fn();
    render(
      <StatusButton action={() => Promise.reject(new Error("nope"))} onError={onError} errorLabel="Retry">
        Save
      </StatusButton>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByRole("button")).toHaveAttribute("data-status", "error");
    expect(onError).toHaveBeenCalled();
  });
  it("renders on the server", () => {
    expect(renderToString(<StatusButton>Server</StatusButton>)).toContain("Server");
  });
});

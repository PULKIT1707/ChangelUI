import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FormField } from "../../src/components/form-field";
import { Input } from "../../src/components/input";

const email = (v: string) => (/^\S+@\S+\.\S+$/.test(v) ? null : "Enter an email like name@example.com");

describe("FormField", () => {
  it("wires label, hint and ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <FormField ref={ref} label="Email" hint="Work or personal">
        {(control) => <Input {...control} />}
      </FormField>,
    );
    expect(ref.current?.tagName).toBe("DIV");
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAccessibleDescription("Work or personal");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("stays quiet while typing, errors on blur, then clears live", () => {
    render(
      <FormField label="Email" validate={email}>
        {(control) => <Input {...control} />}
      </FormField>,
    );
    const input = screen.getByLabelText("Email");
    fireEvent.change(input, { target: { value: "ada" } });
    expect(screen.queryByText(/Enter an email/)).not.toBeInTheDocument();
    fireEvent.blur(input);
    expect(screen.getByText(/Enter an email/)).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(input, { target: { value: "ada@example.com" } });
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("runs required and maxLength rules and shows the counter", () => {
    render(
      <FormField label="Bio" required maxLength={5}>
        {(control) => <Input {...control} />}
      </FormField>,
    );
    const input = screen.getByLabelText(/Bio/);
    fireEvent.blur(input);
    expect(screen.getByText("This field is required")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "abcdefg" } });
    expect(screen.getByText("Use 5 characters or fewer")).toBeInTheDocument();
    expect(screen.getByText("7/5")).toBeInTheDocument();
  });

  it("debounces async checks and shows success", async () => {
    vi.useFakeTimers();
    const check = vi.fn(async (v: string) => (v === "taken" ? "That username is taken" : null));
    render(
      <FormField label="Username" validateAsync={check} successMessage="Available" debounce={300}>
        {(control) => <Input {...control} />}
      </FormField>,
    );
    const input = screen.getByLabelText("Username");
    fireEvent.change(input, { target: { value: "taken" } });
    fireEvent.blur(input);
    expect(screen.getByText("Checking…")).toBeInTheDocument();
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText("That username is taken")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "ada" } });
    expect(check).toHaveBeenCalledTimes(1);
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });
    expect(check).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Available")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("renders on the server", () => {
    expect(
      renderToString(
        <FormField label="Name" hint="As on your card">
          {(control) => <Input {...control} />}
        </FormField>,
      ),
    ).toContain("As on your card");
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { createRef, type Ref } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContent,
  MorphingDialogDescription,
  MorphingDialogTitle,
  MorphingDialogTrigger,
} from "../../src/components/morphing-dialog";

function Example({ triggerRef }: { triggerRef?: Ref<HTMLButtonElement> }) {
  return (
    <MorphingDialog>
      <MorphingDialogTrigger ref={triggerRef} className="mt-4">
        <MorphingDialogTitle>Aurora lamp</MorphingDialogTitle>
      </MorphingDialogTrigger>
      <MorphingDialogContent>
        <MorphingDialogTitle>Aurora lamp</MorphingDialogTitle>
        <MorphingDialogDescription>Details</MorphingDialogDescription>
        <MorphingDialogClose />
      </MorphingDialogContent>
    </MorphingDialog>
  );
}

describe("MorphingDialog", () => {
  it("opens a labelled modal dialog from the trigger and forwards the ref", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Example triggerRef={ref} />);
    expect(ref.current?.className).toContain("mt-4");
    fireEvent.click(screen.getByRole("button", { name: "Aurora lamp" }));
    expect(screen.getByRole("dialog", { name: "Aurora lamp" })).toHaveAttribute("aria-modal", "true");
  });
  it("renders the trigger on the server", () => {
    expect(renderToString(<Example />)).toContain("Aurora lamp");
  });
});

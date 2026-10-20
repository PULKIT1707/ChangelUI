// Regression (FEAT-006 visual review): a trigger or close part with asChild must not append
// controlReset to a library Button child, or tailwind-merge drops the Button's border, padding
// and background (consumer B rendered an outline DialogTrigger as bare text).
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "../../src/components/button";
import { Dialog, DialogClose, DialogTrigger } from "../../src/components/dialog";
import { DropdownMenu, DropdownMenuTrigger } from "../../src/components/dropdown-menu";
import { Popover, PopoverClose, PopoverTrigger } from "../../src/components/popover";

function classesOf(name: string): string[] {
  return screen.getByRole("button", { name }).className.split(/\s+/);
}

/** The wrapped Button must carry exactly the classes of a standalone outline Button. */
function expectOutlineButton(name: string, extra: string[] = []): void {
  const { unmount } = render(<Button variant="outline">Reference</Button>);
  const reference = classesOf("Reference");
  unmount();
  expect(reference).toContain("border");
  expect(classesOf(name)).toEqual([...reference, ...extra]);
}

describe("asChild triggers keep the child's classes", () => {
  it("DialogTrigger and DialogClose", () => {
    render(
      <>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
        </Dialog>
        <Dialog>
          <DialogClose asChild className="extra-class">
            <Button variant="outline">Close dialog</Button>
          </DialogClose>
        </Dialog>
      </>,
    );
    expectOutlineButton("Open dialog");
    expectOutlineButton("Close dialog", ["extra-class"]);
    expect(screen.getByRole("button", { name: "Open dialog" })).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("PopoverTrigger, PopoverClose and DropdownMenuTrigger", () => {
    render(
      <>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Open popover</Button>
          </PopoverTrigger>
          <PopoverClose asChild>
            <Button variant="outline">Close popover</Button>
          </PopoverClose>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Open menu</Button>
          </DropdownMenuTrigger>
        </DropdownMenu>
      </>,
    );
    expectOutlineButton("Open popover");
    expectOutlineButton("Close popover");
    expectOutlineButton("Open menu");
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-haspopup", "menu");
  });

  it("without asChild the trigger still renders a reset native button", () => {
    render(
      <Dialog>
        <DialogTrigger>Plain trigger</DialogTrigger>
      </Dialog>,
    );
    const classes = classesOf("Plain trigger");
    expect(classes).toContain("border-0");
    expect(screen.getByRole("button", { name: "Plain trigger" })).toHaveAttribute("type", "button");
  });
});

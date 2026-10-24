import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AddressInput, addressCountries, formatAddress, validateAddress, type AddressValue } from "../../src/components/address-input";

const us: AddressValue = { country: "US", line1: "500 Market St", line2: "", city: "San Francisco", region: "CA", postalCode: "94103" };

describe("AddressInput", () => {
  it("formats a mailing label in the country's order", () => {
    expect(formatAddress(us)).toEqual(["500 Market St", "San Francisco, CA 94103", "UNITED STATES"]);
    expect(formatAddress({ ...us, country: "DE", line1: "Unter den Linden 1", city: "Berlin", postalCode: "10117" })).toEqual(["Unter den Linden 1", "10117 Berlin", "GERMANY"]);
    expect(formatAddress({ ...us, country: "JP", postalCode: "100-0001", region: "Tokyo", city: "Chiyoda", line1: "1-1" })[0]).toBe("〒100-0001");
  });

  it("validates required fields and postcode patterns", () => {
    expect(validateAddress(us)).toEqual({});
    expect(validateAddress({ ...us, postalCode: "941" }).postalCode).toBe("ZIP codes in the United States look like 94103");
    expect(validateAddress({ ...us, city: "" }).city).toBe("Enter a city");
    expect(addressCountries.length).toBeGreaterThan(8);
  });

  it("relabels fields per country and formats the postcode as you type", () => {
    const ref = createRef<HTMLFieldSetElement>();
    const onValueChange = vi.fn();
    render(<AddressInput ref={ref} defaultValue={{ country: "GB" }} onValueChange={onValueChange} />);
    expect(ref.current?.tagName).toBe("FIELDSET");
    expect(screen.getByLabelText("Town or city")).toHaveAttribute("autocomplete", "address-level2");
    const postcode = screen.getByLabelText("Postcode");
    fireEvent.change(postcode, { target: { value: "sw1a1aa" } });
    expect(postcode).toHaveValue("SW1A 1AA");
    expect(onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ postalCode: "SW1A 1AA" }), expect.objectContaining({ complete: false }));
  });

  it("shows the postcode error after blur", () => {
    render(<AddressInput defaultValue={{ country: "CA" }} section="shipping" />);
    const postal = screen.getByLabelText("Postal code");
    expect(postal).toHaveAttribute("autocomplete", "shipping postal-code");
    fireEvent.change(postal, { target: { value: "k1a" } });
    fireEvent.blur(postal);
    expect(postal).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Postal codes in Canada look like K1A 0B1")).toBeInTheDocument();
  });

  it("renders on the server", () => {
    expect(renderToString(<AddressInput defaultValue={us} />)).toContain("San Francisco");
  });
});

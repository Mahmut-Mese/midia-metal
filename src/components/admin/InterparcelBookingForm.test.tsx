import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InterparcelBookingForm } from "./InterparcelBookingForm";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Interparcel paid collection booking", () => {
  it("sends the chosen collection window and budget only after confirmation", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onBook = vi.fn().mockResolvedValue(undefined);
    render(<InterparcelBookingForm shippingCost={12} disabled={false} onBook={onBook} />);
    fireEvent.change(screen.getByLabelText("Collection date"), { target: { value: "2027-01-04" } });
    fireEvent.change(screen.getByLabelText("Ready from"), { target: { value: "10:00" } });
    fireEvent.change(screen.getByLabelText("Quote budget"), { target: { value: "14.50" } });
    fireEvent.submit(screen.getByRole("button", { name: /Book collection/ }).closest("form")!);
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("charges your Interparcel account"));
    expect(onBook).toHaveBeenCalledWith({ confirm_booking: true, pickup: { date: "2027-01-04", earliest: "10:00", latest: "17:00" }, max_cost: 14.5 });
  });

  it("does not submit when confirmation is cancelled or booking is disabled", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const onBook = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<InterparcelBookingForm shippingCost={12} disabled={false} onBook={onBook} />);
    fireEvent.submit(screen.getByRole("button", { name: /Book collection/ }).closest("form")!);
    expect(onBook).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    rerender(<InterparcelBookingForm shippingCost={12} disabled={true} onBook={onBook} />);
    expect(screen.getByRole("button", { name: /Book collection/ })).toBeDisabled();
    fireEvent.submit(screen.getByRole("button", { name: /Book collection/ }).closest("form")!);
    expect(onBook).not.toHaveBeenCalled();
  });
});

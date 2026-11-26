import { useState } from "react";
import { addDays, format } from "date-fns";

export interface InterparcelBookingInput {
  confirm_booking: boolean;
  pickup: { date: string; earliest: string; latest: string };
  max_cost: number;
}

interface Props {
  shippingCost: number;
  disabled: boolean;
  onBook: (input: InterparcelBookingInput) => Promise<void>;
}

export function InterparcelBookingForm({ shippingCost, disabled, onBook }: Props) {
  const [date, setDate] = useState("");
  const [earliest, setEarliest] = useState("09:00");
  const [latest, setLatest] = useState("17:00");
  const [budget, setBudget] = useState(String(shippingCost));
  const fieldClass = "mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm";

  return (
    <form className="rounded-lg border border-[#cad4e4] bg-white p-4 space-y-3" onSubmit={(event) => {
      event.preventDefault();
      if (disabled || !window.confirm(`Book collection on ${date}? This charges your Interparcel account. The latest quote must be within £${Number(budget).toFixed(2)}. Carrier adjustments may apply after measurement.`)) return;
      void onBook({ confirm_booking: true, pickup: { date, earliest, latest }, max_cost: Number(budget) });
    }}>
      <p className="text-sm font-semibold">Book Interparcel collection</p>
      <p className="text-sm text-gray-600">Confirm packed dimensions, carrier acceptance of these goods and collection access before booking. Pallet measurements must include the pallet and packaging.</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="text-sm">Collection date<input aria-label="Collection date" required type="date" min={format(addDays(new Date(), 1), "yyyy-MM-dd")} value={date} onChange={e => setDate(e.target.value)} className={fieldClass} /></label>
        <label className="text-sm">Ready from<input aria-label="Ready from" required type="time" value={earliest} onChange={e => setEarliest(e.target.value)} className={fieldClass} /></label>
        <label className="text-sm">Available until<input aria-label="Available until" required type="time" min={earliest} value={latest} onChange={e => setLatest(e.target.value)} className={fieldClass} /></label>
        <label className="text-sm">Quote budget (£ incl. VAT)<input aria-label="Quote budget" required type="number" min="0.01" step="0.01" value={budget} onChange={e => setBudget(e.target.value)} className={fieldClass} /></label>
      </div>
      <p className="text-xs text-gray-500">If a request was interrupted, retrying recovers the original booking with its original collection details. Check Interparcel before making a separate booking.</p>
      <button disabled={disabled} type="submit" className="rounded bg-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Book collection / recover booking</button>
    </form>
  );
}

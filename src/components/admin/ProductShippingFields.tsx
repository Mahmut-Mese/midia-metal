interface ShippingProfile {
  shipping_class?: string;
  shipping_weight_kg?: number | string | null;
  shipping_length_cm?: number | string | null;
  shipping_width_cm?: number | string | null;
  shipping_height_cm?: number | string | null;
  ships_separately?: boolean;
}

export default function ProductShippingFields({ value, onChange }: { value: ShippingProfile; onChange: (change: Partial<ShippingProfile>) => void }) {
  const pallet = value.shipping_class === "freight";
  const fields = [
    ["shipping_weight_kg", pallet ? "Packed pallet weight (kg)" : "Item weight (kg)"],
    ["shipping_length_cm", "Shipping length (cm)"],
    ["shipping_width_cm", "Shipping width (cm)"],
    ["shipping_height_cm", "Shipping height (cm)"],
  ] as const;
  return (
    <fieldset className="col-span-2 rounded-lg border border-gray-200 p-4 space-y-3">
      <legend className="px-1 text-sm font-semibold">Delivery measurements</legend>
      <label className="block text-sm">Shipping class
        <select aria-label="Shipping class" value={value.shipping_class || "standard"} onChange={e => onChange({ shipping_class: e.target.value })} className="ml-3 rounded border border-gray-300 p-2">
          <option value="standard">Parcel</option><option value="freight">Pallet</option>
        </select>
      </label>
      <p className="text-sm text-gray-600">{pallet ? "Enter the total weight and outside dimensions of one fully packed pallet, including its base. Each unit purchased ships on its own pallet." : "Enter the item measurements. Configured packaging allowances are added when calculating parcel rates."} Variant measurements override these defaults.</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {fields.map(([key, label]) => <label key={key} className="text-sm">{label}<input aria-label={label} type="number" min="0.01" step="any" value={value[key] ?? ""} onChange={e => onChange({ [key]: e.target.value === "" ? null : Number(e.target.value) })} className="mt-1 block w-full rounded border border-gray-300 p-2" /></label>)}
      </div>
      {!pallet && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(value.ships_separately)} onChange={e => onChange({ ships_separately: e.target.checked })} />Ship this item in its own parcel</label>}
    </fieldset>
  );
}

const defaults = [
  { key: 'hatchback', name: 'Hatchback', carType: 'Hatchback (5 seater)', seats: '5 seater', description: 'Comfortable city rides and everyday trips.', baseFare: 3000, includedKm: 250, ratePerKm: 11 },
  { key: 'suv', name: 'SUV', carType: 'SUV (5 seater)', seats: '5 / 7 seater', description: 'Spacious travel for families and longer journeys.', baseFare: 3500, includedKm: 250, ratePerKm: 12 },
  { key: 'traveller', name: 'Haravan Traveller', carType: 'Haravan Traveller', seats: 'Group travel', description: 'Travel together on group outings and tours.', baseFare: 0, includedKm: 0, ratePerKm: 35 },
];

export const cabPlansWithDefaults = (value) => defaults.map(fallback => ({
  ...fallback,
  ...(Array.isArray(value) ? value.find(plan => plan.key === fallback.key) : null),
}));

export default function CabPlansEditor({ value, onChange }) {
  const plans = cabPlansWithDefaults(value);
  const change = (index, key, next) => onChange(plans.map((plan, position) => position === index ? { ...plan, [key]: next } : plan));
  return <section className="wide service-content-editor">
    <h3>Cab pricing plans</h3>
    <p>Manage every value shown on the cab plan cards and used in fare calculations.</p>
    {plans.map((plan, index) => <fieldset key={plan.key} style={{ marginTop: 16 }}>
      <legend>{plan.name}</legend>
      <div className="grid">
        {[["Plan name", "name"], ["Booking option", "carType"], ["Seats / category", "seats"]].map(([label, key]) => <label className="field" key={key}><span>{label}</span><input required value={plan[key] || ''} onChange={event => change(index, key, event.target.value)} /></label>)}
        {[["Base fare (₹)", "baseFare"], ["Included distance (km)", "includedKm"], ["Rate per extra km (₹)", "ratePerKm"]].map(([label, key]) => <label className="field" key={key}><span>{label}</span><input type="number" min="0" step="0.01" required value={plan[key] ?? ''} onChange={event => change(index, key, event.target.value === '' ? '' : Number(event.target.value))} /></label>)}
        <label className="field wide"><span>Description</span><textarea value={plan.description || ''} onChange={event => change(index, 'description', event.target.value)} /></label>
      </div>
    </fieldset>)}
  </section>;
}

import { driverPricing } from "./shared/driverPricing.js";

export default function DriverPricingEditor({ value, onChange }) {
  const pricing = driverPricing(value);
  const rate = (label, key) => <label className="field" key={key}><span>{label}</span><input type="number" min="0" step="0.01" required value={pricing[key]} onChange={(event) => onChange({ ...pricing, [key]: event.target.value === "" ? "" : Number(event.target.value) })} /></label>;
  return <section className="wide service-content-editor">
    <h3>Driver Only plans & pricing</h3>
    <p>These rates update the plan cards, booking estimate and server calculation. Night charge applies once when the trip overlaps 10 PM–6 AM.</p>
    <div className="grid">{rate("Extra hour rate (₹)", "additionalHourlyRate")}{rate("Night charge (₹)", "nightCharge")}</div>
    {pricing.plans.map((plan, index) => {
      const change = (key, value) => onChange({ ...pricing, plans: pricing.plans.map((item, i) => i === index ? { ...item, [key]: value } : item) });
      return <fieldset key={plan.id} style={{ marginTop: 16 }}><legend>{plan.label}</legend><div className="grid">
        <label className="field"><span>Plan title</span><input required value={plan.label} onChange={(event) => change("label", event.target.value)} /></label>
        <label className="field"><span>{plan.id === "outstation" ? "Daily price (₹)" : "Package price (₹)"}</span><input type="number" min="0" step="0.01" required value={plan.price} onChange={(event) => change("price", event.target.value === "" ? "" : Number(event.target.value))} /></label>
        {plan.id !== "outstation" && <label className="field"><span>Included hours</span><input type="number" min="0.5" step="0.5" required value={plan.hours} onChange={(event) => change("hours", event.target.value === "" ? "" : Number(event.target.value))} /></label>}
        <label className="field wide"><span>Description</span><textarea value={plan.description || ""} onChange={(event) => change("description", event.target.value)} /></label>
      </div></fieldset>;
    })}
  </section>;
}

import { nextTourDay } from "./utils/tourPlans.js";
export default function TourPlansEditor({ value = [], onChange }) {
  const plans = Array.isArray(value) ? value : [];
  const set = (index, key, next) => onChange(plans.map((plan, i) => i === index ? { ...plan, [key]: next } : plan));
  return <section className="field wide"><h3>Tour plans</h3><p>Add each package below. Enter one place per line.</p>
    {plans.map((plan, index) => <fieldset key={index} style={{ border: "1px solid #dbe3ef", padding: 20, borderRadius: 12, marginTop: 16 }}>
      <legend>Plan {index + 1}</legend><div className="grid">
        {[["Days", "days", "number"], ["Title", "title", "text"], ["Price", "price", "text"], ["Image URL", "image", "text"]].map(([label, key, type]) => <label className="field" key={key}><span>{label}</span><input type={type} min={key === "days" ? 1 : undefined} step={key === "days" ? 1 : undefined} required={key === "days" || key === "title"} value={plan[key] ?? ""} onChange={e => set(index, key, key === "days" ? Number(e.target.value) : e.target.value)} /></label>)}
        <label className="field wide"><span>Description</span><textarea value={plan.description || ""} onChange={e => set(index, "description", e.target.value)} /></label>
        <label className="field wide"><span>Places (one per line)</span><textarea value={Array.isArray(plan.places) ? plan.places.join("\n") : plan.places || ""} onChange={e => set(index, "places", e.target.value.split("\n"))} /></label>
      </div><button type="button" className="secondary" onClick={() => onChange(plans.filter((_, i) => i !== index))}>Remove plan</button>
    </fieldset>)}
    <button type="button" className="secondary" style={{ marginTop: 16 }} onClick={() => onChange([...plans, { days: nextTourDay(plans), title: "", price: "", description: "", places: [] }])}>+ Add tour plan</button>
  </section>;
}

import DriverPricingEditor from "./DriverPricingEditor.jsx";
import { validateDriverPricing } from "./shared/driverPricing.js";
import { useState } from 'react';
import { toast } from 'react-toastify';
import { API_BASE } from './utils/api.js';
import { idOf } from './utils/id.js';
import TourPlansEditor from './TourPlansEditor.jsx';
import { prepareTourPlans } from './utils/tourPlans.js';
import CabPlansEditor, { cabPlansWithDefaults } from './CabPlansEditor.jsx';

export default function PageServicesEditor({ services, onSaved }) {
  return <section className="service-content-editor"><h3>Service cards & pricing</h3><p>Changes update the website after saving. Main service prices are calculated from their plan and rate fields below.</p>{services.map(service => <ServiceCard key={idOf(service)} service={service} onSaved={onSaved} />)}</section>;
}
function ServiceCard({ service, onSaved }) {
  const [draft, setDraft] = useState(service);
  const [saving, setSaving] = useState(false);
  const field = (label, key, group) => <label className="field" key={key}><span>{label}</span><input type={group ? 'number' : 'text'} min={group ? 0 : undefined} step={group ? 'any' : undefined} value={(group ? draft[group]?.[key] : draft[key]) ?? ''} onChange={event => setDraft(current => group ? { ...current, [group]: { ...current[group], [key]: event.target.value } } : { ...current, [key]: event.target.value })} /></label>;
  const save = async () => {
    if (!draft.name.trim()) return toast.error('Service name is required.');
    setSaving(true);
    try {
      const body = { name: draft.name, eyebrow: draft.eyebrow, detail: draft.detail, price: draft.price, tourPlans: prepareTourPlans(draft.tourPlans || []) };
      if (draft.slug === 'driver-only') body.driverPricing = validateDriverPricing(draft.driverPricing);
      if (draft.pricingType === 'distance' || draft.slug === 'car-driver') {
        body.cabPlans = cabPlansWithDefaults(draft.cabPlans).map(plan => ({ ...plan, baseFare: Number(plan.baseFare), includedKm: Number(plan.includedKm), ratePerKm: Number(plan.ratePerKm) }));
        body.vehicleRates = Object.fromEntries(body.cabPlans.map(plan => [plan.key, plan.ratePerKm]));
      }
      for (const group of ['vehicleRates', 'monthlyRates']) if (draft[group] && !(group === 'vehicleRates' && (draft.pricingType === 'distance' || draft.slug === 'car-driver'))) {
        body[group] = {};
        for (const [key, value] of Object.entries(draft[group])) {
          if (value === '' || value == null) continue;
          if (!Number.isFinite(Number(value)) || Number(value) < 0) throw Error('Enter valid non-negative rates.');
          body[group][key] = Number(value);
        }
      }
      const response = await fetch(`${API_BASE}/api/services/${idOf(service)}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('chalakgo_admin_token')}` }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw Error(data.message || 'Unable to save service.');
      setDraft(data); onSaved(data); toast.success('Service and pricing updated.');
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  };
  return <details><summary>{service.name} — Edit content & prices</summary><fieldset disabled={saving} style={{ border: 0, padding: '16px 0' }}><div className="grid">
    {field('Service name', 'name')}{field('Short heading', 'eyebrow')}
    {!['driver-only', 'car-driver', 'permanent-driver', 'jaipur-tour'].includes(draft.slug) && field('Display price (e.g. ₹65/hr)', 'price')}
    <label className="field wide"><span>Description</span><textarea value={draft.detail || ''} onChange={event => setDraft({ ...draft, detail: event.target.value })} /></label>
    {(draft.pricingType === 'monthly' || draft.slug === 'permanent-driver') && <>{field('6–8 hours monthly rate', 'sixToEight', 'monthlyRates')}{field('8–10 hours monthly rate', 'eightToTen', 'monthlyRates')}{field('10–12 hours monthly rate', 'tenToTwelve', 'monthlyRates')}</>}
    {draft.slug === 'driver-only' && <DriverPricingEditor value={draft.driverPricing} onChange={driverPricing => setDraft({ ...draft, driverPricing })} />}
    {(draft.pricingType === 'distance' || draft.slug === 'car-driver') && <CabPlansEditor value={draft.cabPlans} onChange={cabPlans => setDraft({ ...draft, cabPlans })} />}
    {(draft.slug === 'jaipur-tour' || draft.tourPlans?.length > 0) && <TourPlansEditor value={draft.tourPlans || []} onChange={tourPlans => setDraft({ ...draft, tourPlans })} />}
  </div><button type="button" className="primary" onClick={save}>{saving ? 'Saving...' : 'Save service & pricing'}</button></fieldset></details>;
}

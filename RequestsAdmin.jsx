import { periodStarts } from './utils/dashboard.js';
import { API_BASE as base } from "./utils/api.js";
import { bookingDetails, formatBookingEstimate } from "./utils/bookingDetails.js";
import { useEffect, useRef, useState } from "react";
import { toast } from 'react-toastify';
import { idOf } from './utils/id.js';
import "./styles.css";

const api = async (path, options = {}) => {
  const token = sessionStorage.getItem("chalakgo_admin_token"),
    r = await fetch(base + path, {
      ...options,
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    }),
    d = r.status === 204 ? null : await r.json();
  if (!r.ok) throw Error(d.message);
  return d;
};
export default function RequestsAdmin({ initialTab = "bookings", initialPeriod = "total" }) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(initialPeriod);
  const [tab, setTab] = useState(initialTab),
    [items, setItems] = useState([]),
    [error, setError] = useState("");
  useEffect(() => { setSelected([]); }, [tab, period, search]);
  useEffect(() => { setTab(initialTab); }, [initialTab]);
  useEffect(() => {
    const controller = new AbortController();
    setItems([]); setError(""); setLoading(true);
    const refresh = () => api(`/api/${tab}/admin`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setItems(data.map(item => ({ ...item, _id: idOf(item) }))); setError(''); } })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    refresh();
    window.addEventListener('admin-requests-updated', refresh);
    return () => { controller.abort(); window.removeEventListener('admin-requests-updated', refresh); };
  }, [tab]);
  const now = new Date();
  const start = periodStarts(now)[period];
  const dated = tab === 'users' || !start ? items : items.filter(item => new Date(item.createdAt) >= start && new Date(item.createdAt) <= now);
  const filtered = dated.filter(item => [item.fullName, item.name, item.phone, item.mobile, item.email, item.bookingId, item.service, item.pickupAddress, item.pickupLocation].filter(Boolean).join(' ').toLowerCase().includes(search.trim().toLowerCase()));
  const [deleting, setDeleting] = useState(null);
  const remove = async (records) => {
    if (deleting || !records.length) return;
    const description = records.length === 1 ? records[0].fullName || records[0].name || 'this record' : records.length + ' selected records';
    if (!window.confirm('Permanently delete ' + description + '? This cannot be undone.')) return;
    const kind = tab;
    setDeleting(true); setError('');
    const removed = [];
    let failures = 0;
    try {
      for (const record of records) {
        try {
          await api('/api/' + kind + '/admin/' + record._id, { method: 'DELETE' });
          removed.push(record._id);
          window.dispatchEvent(new CustomEvent('admin-request-deleted', { detail: { kind, id: record._id } }));
        } catch { failures += 1; }
      }
      setItems(current => current.filter(record => !removed.includes(record._id)));
      setSelected(current => current.filter(id => !removed.includes(id)));
      if (removed.length) toast.success(removed.length + ' record(s) deleted.');
      if (failures) toast.error(failures + ' record(s) could not be deleted. Please try again.');
    } finally { setDeleting(false); }
  };
  const selectedRecords = filtered.filter(record => selected.includes(record._id));
  const allSelected = filtered.length > 0 && selectedRecords.length === filtered.length;
  const toggleSelected = (id) => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const navigation = (x) => {
    const latitude = x.pickupLatitude ?? x.coordinates?.latitude ?? x.pickup?.coordinates?.latitude;
    const longitude = x.pickupLongitude ?? x.coordinates?.longitude ?? x.pickup?.coordinates?.longitude;
    return latitude != null && longitude != null && latitude !== "" && longitude !== "" && Number.isFinite(Number(latitude)) &&
      Number.isFinite(Number(longitude))
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`
      : "";
  };
  const copyBooking = async (booking) => {
    const text = [
      'CHALAKGO - Booking details',
      ...(booking.bookingId ? ['Booking ID: ' + booking.bookingId] : []),
      ...bookingDetails(booking).map(([label, value]) => label + ': ' + value),
      ...(navigation(booking) ? ['Navigate to pickup: ' + navigation(booking)] : []),
    ].join('\n');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const input = document.createElement('textarea');
        input.value = text;
        input.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(input);
        const previousFocus = document.activeElement;
        try {
          input.select();
          if (!document.execCommand('copy')) throw new Error('Copy failed');
        } finally {
          input.remove();
          previousFocus?.focus();
        }
      }
      toast.success('Complete booking details copied.');
    } catch {
      toast.error('Unable to copy. Please allow clipboard access and try again.');
    }
  };
  const sharePickup = async (booking) => {
    const url = navigation(booking);
    if (!url) return;
    const text = ('CHALAKGO - Pickup location for ' + (booking.fullName || 'customer') + '\n' +
      (booking.pickupAddress || booking.pickupLocation || booking.pickup?.formattedAddress || '')).trim();
    if (navigator.share) {
      try {
        await navigator.share({ title: 'CHALAKGO pickup location', text, url });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(text + '\n' + url), '_blank', 'noopener,noreferrer');
  };
  const updateRole = async (user, role) => {
    try {
      const updated = await api(`/api/users/admin/${user._id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      setItems((current) =>
        current.map((item) => (item._id === updated._id ? updated : item)),
      );
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <section className="requests-page" aria-label="Customer requests">
      <header className="requests-heading">
        <div><span className="requests-eyebrow">CUSTOMER MANAGEMENT</span><h2>Customer requests</h2><p>Manage bookings, enquiries and customers in one place.</p></div>
        <div className="requests-count"><strong>{filtered.length}</strong><span>{tab === 'users' ? 'Customers' : tab === 'contacts' ? 'Enquiries' : 'Bookings'} in view</span></div>
      </header>
      <div className="requests-panel">
        <div className="requests-toolbar">
          <div className="requests-tabs" aria-label="Request category">
            {['bookings', 'contacts', 'users'].map(kind => <button key={kind} type="button" aria-pressed={tab === kind} className={tab === kind ? 'is-active' : ''} disabled={Boolean(deleting)} onClick={() => setTab(kind)}>{kind === 'bookings' ? 'Bookings' : kind === 'contacts' ? 'Contacts' : 'Users'}</button>)}
          </div>
          <div className="requests-filters">
            <label className="requests-search"><span>Search {tab}</span><input type="search" placeholder="Name, phone or booking ID..." value={search} disabled={Boolean(deleting)} onChange={event => setSearch(event.target.value)} /></label>
            {tab !== 'users' && <label><span>Period (India time)</span><select value={period} disabled={Boolean(deleting)} onChange={event => setPeriod(event.target.value)}><option value="total">All time</option><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option></select></label>}
          </div>
        </div>
        <div className="requests-selection">
          <label className="request-check"><input type="checkbox" checked={allSelected} ref={node => { if (node) node.indeterminate = selectedRecords.length > 0 && !allSelected; }} disabled={!filtered.length || Boolean(deleting)} onChange={() => setSelected(allSelected ? [] : filtered.map(record => record._id))} />Select all</label>
          <span>{selectedRecords.length ? selectedRecords.length + ' selected' : filtered.length + ' records'}</span>
          {selectedRecords.length > 0 && <><button type="button" className="requests-clear" disabled={Boolean(deleting)} onClick={() => setSelected([])}>Clear selection</button><RequestActions disabled={Boolean(deleting)} label="Actions" onDelete={() => remove(selectedRecords)} deleteLabel={'Delete selected (' + selectedRecords.length + ')'} /></>}
        </div>
        {error && <p className="requests-error" role="alert">{error}</p>}
        <div className="requests-list" aria-busy={loading || Boolean(deleting)}>
          {filtered.map(x => (
            <article className={'request-card' + (selected.includes(x._id) ? ' is-selected' : '')} key={x._id}>
              <div className="request-card-header">
                <label className="request-check"><input type="checkbox" aria-label={'Select ' + (x.fullName || x.name || 'record')} checked={selected.includes(x._id)} disabled={Boolean(deleting)} onChange={() => toggleSelected(x._id)} /></label>
                <div className="request-identity"><h3>{x.fullName || x.name || 'Customer'}</h3><span>{tab === 'bookings' ? x.service : tab === 'contacts' ? 'Contact enquiry' : 'Customer account'}{x.bookingId ? ' ? ' + x.bookingId : ''}</span></div>
                <span className="request-status">{x.status || (tab === 'bookings' ? 'Booking received' : tab === 'contacts' ? 'Enquiry received' : 'Registered')}</span>
                <RequestActions disabled={Boolean(deleting)} onDelete={() => remove([x])} />
              </div>
              <div className="request-overview">
                <div><span>Phone number</span><strong>{x.phone || x.mobile || 'Not provided'}</strong></div>
                {tab === 'bookings' ? <><div><span>Pickup location</span><strong>{x.pickupAddress || x.pickupLocation || x.pickup?.formattedAddress || 'Not provided'}</strong></div><div><span>Start date & time</span><strong>{(x.startDateTime || [x.startDate, x.startTime].filter(Boolean).join(' ') || 'Not provided').replace('T', ' ')}</strong></div></> : <div><span>Email address</span><strong>{x.email || 'Not provided'}</strong></div>}
              </div>
              {tab === 'contacts' && x.message && <p className="request-message">{x.message}</p>}
              {tab === 'bookings' && <div className="request-estimate"><span>TOTAL ESTIMATE</span><strong>{formatBookingEstimate(x)}</strong></div>}
              <div className="request-card-footer">
                {tab === 'bookings' && <div className="request-quick-actions"><button type="button" className="secondary" onClick={() => copyBooking(x)}>Copy all details</button>{navigation(x) && <><a className="secondary" href={navigation(x)} target="_blank" rel="noreferrer">Navigate to pickup ?</a><button type="button" className="primary" onClick={() => sharePickup(x)}>Share pickup</button></>}</div>}
                {tab === 'users' && <label className="request-role">Account role<select value={x.role || 'user'} onChange={event => updateRole(x, event.target.value)} aria-label={'Role for ' + x.fullName}><option value="user">User</option><option value="admin">Admin</option></select></label>}
              </div>
              <details className="request-expanded"><summary>{tab === 'bookings' ? 'Booking form details' : 'Complete details'}</summary><dl className="request-details">{(tab === 'bookings' ? bookingDetails(x) : detailsOf(x)).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details>
            </article>
          ))}
          {!filtered.length && !error && <div className="requests-empty"><strong>{loading ? 'Loading requests...' : search ? 'No matching records' : 'No records yet'}</strong><p>{loading ? 'Your customer records will appear here.' : search ? 'Try another name, phone number or booking ID.' : 'New requests will appear here when they arrive.'}</p></div>}
        </div>
      </div>
    </section>
  );
}

function RequestActions({ disabled, onDelete, label = 'Actions', deleteLabel = 'Delete record' }) {
  const [open, setOpen] = useState(false);
  const container = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = event => { if (!container.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') { setOpen(false); container.current?.querySelector('button')?.focus(); } };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="request-actions-menu" ref={container} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button type="button" className="secondary" aria-expanded={open} disabled={disabled} onClick={() => setOpen(value => !value)}>{label} <span aria-hidden="true">?</span></button>
    {open && <div className="request-actions-popover"><button type="button" disabled={disabled} onClick={() => { setOpen(false); onDelete(); }}>{deleteLabel}</button></div>}
  </div>;
}

function detailsOf(record, prefix = "") {
  return Object.entries(record).flatMap(([key, value]) => {
    if (["_id", "__v", "passwordHash", "otpHash", "otpExpiresAt", "otpAttempts"].includes(key)) return [];
    const label = prefix + key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase());
    if (value && typeof value === "object" && !Array.isArray(value)) return detailsOf(value, label + " / ");
    return [[label, value == null || value === "" ? "?" : typeof value === "object" ? JSON.stringify(value) : String(value)]];
  });
}

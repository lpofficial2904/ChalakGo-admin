import { periodStarts } from '../backend/utils/dashboard.js';
import { API_BASE as base } from "./utils/api.js";
import { bookingDetails } from "./utils/bookingDetails.js";
import { useEffect, useState } from "react";
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
  const [period, setPeriod] = useState(initialPeriod);
  const [tab, setTab] = useState(initialTab),
    [items, setItems] = useState([]),
    [error, setError] = useState("");
  useEffect(() => { setTab(initialTab); }, [initialTab]);
  useEffect(() => {
    const controller = new AbortController();
    setItems([]); setError("");
    const refresh = () => api(`/api/${tab}/admin`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setItems(data.map(item => ({ ...item, _id: idOf(item) }))); setError(''); } })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    refresh();
    window.addEventListener('admin-requests-updated', refresh);
    return () => { controller.abort(); window.removeEventListener('admin-requests-updated', refresh); };
  }, [tab]);
  const now = new Date();
  const start = periodStarts(now)[period];
  const filtered = tab === 'users' || !start ? items : items.filter(item => new Date(item.createdAt) >= start && new Date(item.createdAt) <= now);
  const [deleting, setDeleting] = useState(null);
  const remove = async (item) => {
    if (deleting) return;
    if (!window.confirm(`Permanently delete ${item.fullName || item.name || 'this record'}? This cannot be undone.`)) return;
    const kind = tab;
    setDeleting(item._id); setError('');
    try {
      await api(`/api/${kind}/admin/${item._id}`, { method: 'DELETE' });
      setItems(current => current.filter(record => record._id !== item._id));
      window.dispatchEvent(new CustomEvent('admin-request-deleted', { detail: { kind, id: item._id } }));
      toast.success('Record deleted successfully.');
    } catch (e) { setError(e.message); toast.error(e.message); }
    finally { setDeleting(null); }
  };
  const title =
    tab === "bookings"
      ? (x) => `${x.service} — ${x.fullName}`
      : tab === "contacts"
        ? (x) => x.name
        : (x) => x.fullName;
  const sub =
    tab === "bookings"
      ? (x) => `${x.phone} · ${x.pickupAddress || x.pickupLocation}`
      : tab === "contacts"
        ? (x) => `${x.phone} · ${x.email} · ${x.message}`
        : (x) =>
            `${x.mobile} · Joined ${new Date(x.createdAt).toLocaleDateString()}`;
  const navigation = (x) => {
    const latitude = x.pickupLatitude ?? x.coordinates?.latitude;
    const longitude = x.pickupLongitude ?? x.coordinates?.longitude;
    return latitude != null && longitude != null && latitude !== "" && longitude !== "" && Number.isFinite(Number(latitude)) &&
      Number.isFinite(Number(longitude))
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`
      : "";
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
    <main className="admin-loading">
      <section
        className="card editor"
        style={{ width: "min(940px, calc(100vw - 32px))", margin: "32px auto" }}
      >
        <div className="form-head">
          <div>
            <small>CHALAKGO ADMIN</small>
            <h2>Customer requests</h2>
            <p>All bookings, contact enquiries and registered users.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            className={tab === "bookings" ? "primary" : "secondary"}
            disabled={Boolean(deleting)}
            onClick={() => setTab("bookings")}
          >
            Bookings
          </button>
          <button
            className={tab === "contacts" ? "primary" : "secondary"}
            disabled={Boolean(deleting)}
            onClick={() => setTab("contacts")}
          >
            Contacts
          </button>
          <button
            className={tab === "users" ? "primary" : "secondary"}
            disabled={Boolean(deleting)}
            onClick={() => setTab("users")}
          >
            Users
          </button>
        </div>
        {tab !== 'users' && <label className="field" style={{ marginTop: 20 }}><span>Filter requests (India time)</span><select value={period} onChange={event => setPeriod(event.target.value)}><option value="total">All time</option><option value="today">Daily ? Today</option><option value="week">Weekly ? This week</option><option value="month">Monthly ? This month</option></select><small>{filtered.length} requests</small></label>}
        {error && <p className="empty">{error}</p>}
        <div className="rows">
          {filtered.map((x) => (
            <article className="row" key={x._id}>
              <div className="copy">
                <b>{title(x)}</b>
                <small>{sub(x)}</small>
                <details style={{ marginTop: 12 }}><summary style={{ cursor: "pointer", color: "#2563eb" }}>{tab === "bookings" ? "Booking form details" : "Complete details"}</summary><dl className="request-details">{(tab === "bookings" ? bookingDetails(x) : detailsOf(x)).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details>
              </div>
              {tab === "bookings" && navigation(x) && (
                <a
                  className="secondary"
                  href={navigation(x)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Navigate to pickup
                </a>
              )}
              {tab === "users" && (
                <select
                  value={x.role || "user"}
                  onChange={(event) => updateRole(x, event.target.value)}
                  aria-label={`Role for ${x.fullName}`}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              )}
              <span className="status live">{x.status || "Registered"}</span>
              <button type="button" className="secondary request-delete" aria-label={`Delete ${x.fullName || x.name || 'record'}`} disabled={Boolean(deleting)} onClick={() => remove(x)}>{deleting === x._id ? "Deleting..." : "Delete"}</button>
            </article>
          ))}
          {!filtered.length && !error && <p className="empty">No records yet.</p>}
        </div>
      </section>
    </main>
  );
}

function detailsOf(record, prefix = "") {
  return Object.entries(record).flatMap(([key, value]) => {
    if (["_id", "__v", "passwordHash", "otpHash", "otpExpiresAt", "otpAttempts"].includes(key)) return [];
    const label = prefix + key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase());
    if (value && typeof value === "object" && !Array.isArray(value)) return detailsOf(value, label + " / ");
    return [[label, value == null || value === "" ? "?" : typeof value === "object" ? JSON.stringify(value) : String(value)]];
  });
}

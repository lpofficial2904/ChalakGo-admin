import { API_BASE as base } from "./utils/api.js";
import { useEffect, useState } from "react";
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
    d = await r.json();
  if (!r.ok) throw Error(d.message);
  return d;
};
export default function RequestsAdmin() {
  const [tab, setTab] = useState("bookings"),
    [items, setItems] = useState([]),
    [error, setError] = useState("");
  useEffect(() => {
    api(`/api/${tab}/admin`)
      .then(setItems)
      .catch((e) => setError(e.message));
  }, [tab]);
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
    return Number.isFinite(Number(latitude)) &&
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
            onClick={() => setTab("bookings")}
          >
            Bookings
          </button>
          <button
            className={tab === "contacts" ? "primary" : "secondary"}
            onClick={() => setTab("contacts")}
          >
            Contacts
          </button>
          <button
            className={tab === "users" ? "primary" : "secondary"}
            onClick={() => setTab("users")}
          >
            Users
          </button>
        </div>
        {error && <p className="empty">{error}</p>}
        <div className="rows">
          {items.map((x) => (
            <article className="row" key={x._id}>
              <div className="copy">
                <b>{title(x)}</b>
                <small>{sub(x)}</small>
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
            </article>
          ))}
          {!items.length && !error && <p className="empty">No records yet.</p>}
        </div>
      </section>
    </main>
  );
}

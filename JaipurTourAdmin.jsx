import { API_BASE as base } from "./utils/api.js";
import { useEffect, useState } from "react";
import "./styles.css";
import { toast } from "react-toastify";


const api = async (path, options = {}) => {
  const token = sessionStorage.getItem("chalakgo_admin_token");
  const response = await fetch(base + path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.message || "Request failed.");
  return data;
};
const list = (value) =>
  String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
const upload = async (file) => {
  const token = sessionStorage.getItem("chalakgo_admin_token"),
    body = new FormData();
  body.append("image", file);
  const response = await fetch(base + "/api/uploads", {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.message || "Image upload failed.");
  return base + data.url;
};

export default function JaipurTourAdmin() {
  const [tour, setTour] = useState(null),
    [notice, setNotice] = useState("");
  useEffect(() => {
    api("/api/services/admin")
      .then((items) => {
        const item = items.find((service) => service.slug === "jaipur-tour");
        if (!item) throw Error("Jaipur Tour service not found.");
        const plan = (days) =>
          item.tourPlans?.find((value) => value.days === days) || {};
        setTour({
          ...item,
          featuresText: (item.features || []).join("\n"),
          plans: [1, 2].reduce(
            (all, days) => ({
              ...all,
              [days]: {
                ...plan(days),
                title: plan(days).title || "",
                description: plan(days).description || "",
                image: plan(days).image || "",
                price: plan(days).price || "",
                placesText: (plan(days).places || []).join("\n"),
              },
            }),
            {},
          ),
        });
      })
      .catch((error) => {
        setNotice(error.message);
        toast.error(error.message);
      });
  }, []);
  if (!tour)
    return <main className="admin-loading">Loading Jaipur Tour editor…</main>;
  const set = (key, value) => setTour((old) => ({ ...old, [key]: value }));
  const setPlan = (days, key, value) =>
    setTour((old) => ({
      ...old,
      plans: { ...old.plans, [days]: { ...old.plans[days], [key]: value } },
    }));
  const save = async (event) => {
    event.preventDefault();
    try {
      const body = {
        name: tour.name,
        slug: "jaipur-tour",
        price: tour.price,
        eyebrow: tour.eyebrow,
        detail: tour.detail,
        image: tour.image,
        isActive: tour.isActive,
        features: list(tour.featuresText),
        tourPlans: [1, 2].map((days) => ({
          days,
          ...tour.plans[days],
          places: list(tour.plans[days].placesText),
        })),
      };
      const saved = await api(`/api/services/${tour._id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      setTour((old) => ({ ...old, ...saved }));
      setNotice("Jaipur Tour details saved successfully.");
      toast.success("Jaipur Tour details saved successfully.");
    } catch (error) {
      setNotice(error.message);
      toast.error(error.message);
    }
  };
  return (
    <main className="admin-loading">
      <form
        className="card editor"
        onSubmit={save}
        style={{ width: "min(940px, calc(100vw - 32px))", margin: "32px auto" }}
      >
        <div className="form-head">
          <div>
            <small>CHALAKGO ADMIN · SERVICES</small>
            <h2>Jaipur Tour editor</h2>
            <p>
              Manage each 1-day and 2-day package: full details, price, places
              and image.
            </p>
          </div>
          <a className="back" href="/">
            Back to dashboard
          </a>
        </div>
        {notice && <p className="empty">{notice}</p>}
        <div className="grid">
          <Field
            label="Service name"
            value={tour.name}
            onChange={(value) => set("name", value)}
            required
          />
          <Field
            label="Starting price"
            value={tour.price}
            onChange={(value) => set("price", value)}
          />
          <Field
            label="Short heading"
            value={tour.eyebrow}
            onChange={(value) => set("eyebrow", value)}
            wide
          />
          <Field
            label="Service description"
            value={tour.detail}
            onChange={(value) => set("detail", value)}
            area
            wide
          />
          <Field
            label="Service features (one per line)"
            value={tour.featuresText}
            onChange={(value) => set("featuresText", value)}
            area
            wide
          />
          <PlanEditor days={1} plan={tour.plans[1]} setPlan={setPlan} />
          <PlanEditor days={2} plan={tour.plans[2]} setPlan={setPlan} />
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={!!tour.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
          />
          <i></i>
          <span>
            <b>Publish Jaipur Tour</b>
            <small>Show this service on the website</small>
          </span>
        </label>
        <div className="form-footer">
          <button className="primary">Save Jaipur Tour details</button>
        </div>
      </form>
    </main>
  );
}

function Field({ label, value, onChange, area, wide, required }) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {area ? (
        <textarea
          value={value || ""}
          required={required}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          value={value || ""}
          required={required}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function PlanEditor({ days, plan, setPlan }) {
  const [uploading, setUploading] = useState(false);
  const pick = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      setPlan(days, "image", await upload(file));
      toast.success(`${days}-day package image uploaded.`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };
  return (
    <fieldset
      className="field wide"
      style={{ border: "1px solid #dbeafe", borderRadius: 12, padding: 18 }}
    >
      <legend style={{ fontWeight: 800, padding: "0 6px" }}>
        {days}-day package
      </legend>
      <div className="grid">
        <Field
          label="Plan title"
          value={plan.title}
          onChange={(value) => setPlan(days, "title", value)}
        />
        <Field
          label="Plan price"
          value={plan.price}
          onChange={(value) => setPlan(days, "price", value)}
          required
        />
        <Field
          label="Plan description"
          value={plan.description}
          onChange={(value) => setPlan(days, "description", value)}
          area
          wide
        />
        <label className="field wide">
          <span>Plan image — upload from computer</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={uploading}
            onChange={pick}
          />
          {uploading && <small>Uploading…</small>}
          {plan.image && (
            <img
              src={plan.image}
              alt={`${days}-day preview`}
              style={{
                maxHeight: 160,
                maxWidth: "100%",
                marginTop: 10,
                borderRadius: 8,
              }}
            />
          )}
        </label>
        <Field
          label="Places included (one per line)"
          value={plan.placesText}
          onChange={(value) => setPlan(days, "placesText", value)}
          area
          wide
          required
        />
      </div>
    </fieldset>
  );
}

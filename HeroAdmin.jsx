import { API_BASE as base } from "./utils/api.js";
import { useEffect, useState } from "react";
import "./styles.css";

export default function HeroAdmin() {
  const [image, setImage] = useState(""),
    [notice, setNotice] = useState("");
  const token = sessionStorage.getItem("chalakgo_admin_token");
  useEffect(() => {
    fetch(base + "/api/settings")
      .then((r) => r.json())
      .then((s) => setImage(s.heroImage || ""))
      .catch(() => {});
  }, []);
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNotice("Uploading…");
    try {
      const body = new FormData();
      body.append("image", file);
      const r = await fetch(base + "/api/uploads", {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.message);
      const url = base + d.url;
      const saved = await fetch(base + "/api/settings", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ heroImage: url }),
      });
      if (!saved.ok) throw Error("Could not save image.");
      setImage(url);
      setNotice("Homepage image saved successfully.");
    } catch (x) {
      setNotice(x.message || "Upload failed.");
    }
  };
  return (
    <main className="admin-loading">
      <section
        className="card editor"
        style={{ width: "min(640px, calc(100vw - 32px))", margin: "32px auto" }}
      >
        <div className="form-head">
          <div>
            <small>CHALAKGO ADMIN</small>
            <h2>Homepage hero image</h2>
            <p>
              This controls the large image on the right side of the homepage.
            </p>
          </div>
        </div>
        <label className="field wide" style={{ marginTop: 24 }}>
          <span>Upload image from computer</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={upload}
          />
        </label>
        {image && (
          <img
            src={image}
            alt="Current homepage hero"
            style={{
              width: "100%",
              maxHeight: 330,
              objectFit: "cover",
              borderRadius: 12,
              marginTop: 18,
            }}
          />
        )}
        {notice && <p className="empty">{notice}</p>}
      </section>
    </main>
  );
}

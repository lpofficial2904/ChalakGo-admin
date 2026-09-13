import { API_BASE as base } from "./utils/api.js";
import { useEffect, useState } from "react";
import "./styles.css";
import { toast } from "react-toastify";


const request = async (path, options = {}) => {
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
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw Error(data.message || "Request failed.");
  return data;
};
const upload = async (file) => {
  const token = sessionStorage.getItem("chalakgo_admin_token"),
    body = new FormData();
  body.append("image", file);
  const r = await fetch(base + "/api/uploads", {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.message || "Upload failed.");
  return base + d.url;
};
const slugify = (v) =>
  v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function File({ value, setValue }) {
  const [status, setStatus] = useState("");
  return (
    <label className="field wide">
      <span>Cover image — upload from computer</span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setStatus("Uploading…");
          try {
            setValue(await upload(f));
            setStatus("Uploaded.");
            toast.success("Image uploaded successfully.");
          } catch (x) {
            setStatus(x.message);
            toast.error(x.message);
          }
        }}
      />
      {status && <small>{status}</small>}
      {value && (
        <img
          style={{ maxHeight: 150, marginTop: 10, borderRadius: 8 }}
          src={value}
          alt="Preview"
        />
      )}
    </label>
  );
}
function Field({ label, value, setValue, area, required, wide }) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {area ? (
        <textarea
          required={required}
          value={value || ""}
          onChange={(e) => setValue(e.target.value)}
        />
      ) : (
        <input
          required={required}
          value={value || ""}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
    </label>
  );
}
function Rows({ items, edit, remove, sub }) {
  return (
    <div className="rows">
      {items.map((x) => (
        <article className="row" key={x._id}>
          <div className="copy">
            <b>{x.customerName || x.title}</b>
            <small>{sub(x)}</small>
          </div>
          <div className="actions">
            <button onClick={() => edit(x)}>Edit</button>
            <button onClick={() => remove(x._id)}>Delete</button>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function ContentAdmin() {
  const [tab, setTab] = useState("reviews"),
    [items, setItems] = useState([]),
    [notice, setNotice] = useState(""),
    [review, setReview] = useState({
      customerName: "",
      designation: "",
      message: "",
      isPublished: true,
    }),
    [blog, setBlog] = useState({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      coverImage: "",
      author: "ChalakGo Team",
      isPublished: true,
    });
  const load = async (which) => {
    try {
      setItems(
        await request(
          which === "reviews" ? "/api/reviews/admin" : "/api/blogs/admin/all",
        ),
      );
    } catch (e) {
      setNotice(e.message);
      toast.error(e.message);
    }
  };
  useEffect(() => {
    load(tab);
  }, [tab]);
  const saveReview = async (e) => {
    e.preventDefault();
    try {
      const v = review._id
        ? await request("/api/reviews/" + review._id, {
            method: "PUT",
            body: JSON.stringify(review),
          })
        : await request("/api/reviews", {
            method: "POST",
            body: JSON.stringify(review),
          });
      setItems((a) =>
        review._id ? a.map((x) => (x._id === v._id ? v : x)) : [v, ...a],
      );
      setReview({
        customerName: "",
        designation: "",
        message: "",
        isPublished: true,
      });
      setNotice("Review saved.");
      toast.success("Review saved.");
    } catch (x) {
      setNotice(x.message);
      toast.error(x.message);
    }
  };
  const saveBlog = async (e) => {
    e.preventDefault();
    try {
      const body = { ...blog, slug: slugify(blog.slug || blog.title) },
        v = blog._id
          ? await request("/api/blogs/" + blog._id, {
              method: "PUT",
              body: JSON.stringify(body),
            })
          : await request("/api/blogs", {
              method: "POST",
              body: JSON.stringify(body),
            });
      setItems((a) =>
        blog._id ? a.map((x) => (x._id === v._id ? v : x)) : [v, ...a],
      );
      setBlog({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        coverImage: "",
        author: "ChalakGo Team",
        isPublished: true,
      });
      setNotice("Blog saved.");
      toast.success("Blog saved.");
    } catch (x) {
      setNotice(x.message);
      toast.error(x.message);
    }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await request(`/api/${tab}/${id}`, { method: "DELETE" });
      setItems((a) => a.filter((x) => x._id !== id));
      toast.success("Item deleted.");
    } catch (e) {
      setNotice(e.message);
      toast.error(e.message);
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
            <h2>Reviews & blog content</h2>
            <p>Images are uploaded from your local computer.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            className={tab === "reviews" ? "primary" : "secondary"}
            onClick={() => setTab("reviews")}
          >
            Reviews
          </button>
          <button
            className={tab === "blogs" ? "primary" : "secondary"}
            onClick={() => setTab("blogs")}
          >
            Blog posts
          </button>
        </div>
        {notice && <p className="empty">{notice}</p>}
        {tab === "reviews" ? (
          <>
            <form className="grid" onSubmit={saveReview}>
              <Field
                label="Customer name"
                value={review.customerName}
                setValue={(v) => setReview({ ...review, customerName: v })}
                required
              />
              <Field
                label="Designation"
                value={review.designation}
                setValue={(v) => setReview({ ...review, designation: v })}
                required
              />
              <Field
                label="Review"
                value={review.message}
                setValue={(v) => setReview({ ...review, message: v })}
                area
                wide
                required
              />
              <button className="primary">
                {review._id ? "Update review" : "Add review"}
              </button>
            </form>
            <Rows
              items={items}
              edit={setReview}
              remove={remove}
              sub={(x) => x.designation}
            />
          </>
        ) : (
          <>
            <form className="grid" onSubmit={saveBlog}>
              <Field
                label="Post title"
                value={blog.title}
                setValue={(v) =>
                  setBlog({
                    ...blog,
                    title: v,
                    slug: blog._id ? blog.slug : slugify(v),
                  })
                }
                required
              />
              <Field
                label="URL slug"
                value={blog.slug}
                setValue={(v) => setBlog({ ...blog, slug: v })}
                required
              />
              <Field
                label="Author"
                value={blog.author}
                setValue={(v) => setBlog({ ...blog, author: v })}
              />
              <File
                value={blog.coverImage}
                setValue={(v) => setBlog({ ...blog, coverImage: v })}
              />
              <Field
                label="Introduction"
                value={blog.excerpt}
                setValue={(v) => setBlog({ ...blog, excerpt: v })}
                area
                wide
              />
              <Field
                label="Article content"
                value={blog.content}
                setValue={(v) => setBlog({ ...blog, content: v })}
                area
                wide
                required
              />
              <button className="primary">
                {blog._id ? "Update blog" : "Publish blog"}
              </button>
            </form>
            <Rows
              items={items}
              edit={setBlog}
              remove={remove}
              sub={(x) => x.slug}
            />
          </>
        )}
      </section>
    </main>
  );
}

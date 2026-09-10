import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AdminPanel from "./AdminPanel";
import JaipurTourAdmin from "./JaipurTourAdmin";
import "./styles.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";

function JaipurTourPlanLink() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const check = () =>
      setVisible(
        [...document.querySelectorAll("input")].some(
          (input) => input.value === "Jaipur Tour",
        ),
      );
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
    });
    return () => observer.disconnect();
  }, []);
  if (!visible) return null;
  return (
    <a
      href="/jaipur-tour"
      aria-label="Manage Jaipur Tour packages"
      className="jaipur-plan-link"
    >
      Manage Jaipur Tour plans
    </a>
  );
}

function AdminApp() {
  const path = window.location.pathname;
  if (path === "/reviews") return <AdminPanel initialTab="reviews" />;
  if (path === "/jaipur-tour") return <JaipurTourAdmin />;
  return (
    <>
      <AdminPanel />
      <JaipurTourPlanLink />
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AdminApp />
    </BrowserRouter>
    <ToastContainer position="top-right" autoClose={3000} />
  </StrictMode>,
);

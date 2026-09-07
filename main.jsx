import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AdminPanel from './AdminPanel'
import ReviewsAdmin from './ReviewsAdmin'
import JaipurTourAdmin from './JaipurTourAdmin'
import './styles.css'

function JaipurTourPlanLink() {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const check = () => setVisible([...document.querySelectorAll('input')].some(input => input.value === 'Jaipur Tour')); check(); const observer = new MutationObserver(check); observer.observe(document.body, { subtree: true, childList: true, attributes: true }); return () => observer.disconnect() }, [])
  if (!visible) return null
  return <a href="/jaipur-tour" aria-label="Manage Jaipur Tour packages" className="jaipur-plan-link">Manage Jaipur Tour plans</a>
}

function AdminApp() {
  const path = window.location.pathname
  if (path === '/reviews') return <ReviewsAdmin />
  if (path === '/jaipur-tour') return <JaipurTourAdmin />
  return <><AdminPanel /><JaipurTourPlanLink /><a href="/reviews" aria-label="Open reviews manager" style={{ position: 'fixed', left: 14, bottom: 84, zIndex: 9999, width: 210, borderRadius: 10, background: '#1463e8', color: '#fff', padding: '12px 14px', font: '700 14px system-ui', textDecoration: 'none', boxShadow: '0 8px 20px rgba(20,99,232,.28)' }}>★ Manage reviews</a></>
}

createRoot(document.getElementById('root')).render(<StrictMode><BrowserRouter><AdminApp /></BrowserRouter></StrictMode>)

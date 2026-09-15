import { pageCounts, publicationCounts, periodStarts } from './utils/dashboard.js';
import { useEffect, useState } from 'react';
import { API_BASE } from './utils/api.js';

export default function DashboardSummary({ onOpen }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let stopped = false, timer, busy = false;
    const controller = new AbortController();
    const get = async path => {
      const response = await fetch(API_BASE + path, { credentials: 'include', cache: 'no-store', signal: controller.signal, headers: { Authorization: 'Bearer ' + sessionStorage.getItem('chalakgo_admin_token') } });
      if (!response.ok) throw Object.assign(Error('Unable to load dashboard data (' + response.status + '). Retrying automatically.'), { status: response.status });
      return response.json();
    };
    const loadSummary = async () => {
      const [services,pages,blogs,bookings,contacts] = await Promise.all(['/api/services/admin','/api/pages/admin/all','/api/blogs/admin/all','/api/bookings/admin','/api/contacts/admin'].map(get));
      const now = new Date(), starts = periodStarts(now);
      const counts = rows => ({ total: rows.length, ...Object.fromEntries(Object.entries(starts).map(([key,start]) => [key,rows.filter(row => new Date(row.createdAt) >= start && new Date(row.createdAt) <= now).length])) });
      return { services: publicationCounts(services,'isActive'), pages: pageCounts(pages), blogs: publicationCounts(blogs,'isPublished'), bookings: counts(bookings), contacts: counts(contacts), updatedAt: now.toISOString() };
    };
    const refresh = async () => {
      if (busy || stopped) return;
      busy = true;
      clearTimeout(timer);
      try {
        const result = await loadSummary();
        if (!stopped) { setData(result); setError(''); }
      } catch (e) { if (!stopped) setError(e.message); }
      finally { busy = false; if (!stopped) timer = setTimeout(refresh, 5000); }
    };
    refresh();
    window.addEventListener('admin-requests-updated', refresh);
    window.addEventListener('admin-request-deleted', refresh);
    window.addEventListener('focus', refresh);
    return () => { stopped = true; controller.abort(); clearTimeout(timer); window.removeEventListener('admin-requests-updated', refresh); window.removeEventListener('admin-request-deleted', refresh); window.removeEventListener('focus', refresh); };
  }, []);
  return <section className="dashboard-summary">
    <div className="dashboard-live"><strong>Business overview</strong><span role="status">{error || (data ? `Updated ${new Date(data.updatedAt).toLocaleTimeString()} · Auto-refresh every 5 seconds` : 'Loading live counts…')}</span></div>
    <div className="dashboard-content-counts">{[['services','Services'],['pages','Website pages'],['blogs','Blog posts']].map(([key,label]) => <article className="card" key={key}><h2>{label}</h2><small>Total</small><strong className="dashboard-number">{data?.[key].total ?? '—'}</strong><div className="dashboard-status-counts"><span className="status live">Active: {data?.[key].active ?? '—'}</span><span className="status">Inactive: {data?.[key].inactive ?? '—'}</span></div></article>)}</div>
    <div className="dashboard-request-counts">{[['bookings','Bookings received'],['contacts','Contact requests']].map(([key,label]) => <article className="card" key={key}><h2>{label}</h2><div className="dashboard-periods">{[['total','All time'],['today','Today'],['week','This week'],['month','This month']].map(([period,title])=><button type="button" key={period} onClick={() => onOpen(key, period)}><span>{title}</span><strong>{data?.[key][period] ?? '—'}</strong></button>)}</div></article>)}</div>
    <p className="dashboard-period-note">India time (IST). Week starts Monday; month starts on the 1st. Counts use request creation time and exclude deleted records.</p>
  </section>;
}

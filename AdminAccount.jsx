import { useState } from "react";
import { API_BASE } from "./utils/api.js";
export default function AdminAccount() {
  const [form, setForm] = useState({ username: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async event => {
    event.preventDefault();
    if (busy) return;
    if (form.newPassword !== form.confirmPassword) return setMessage('New passwords do not match.');
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/auth/credentials`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('chalakgo_admin_token') || ''}` },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.message || 'Unable to update credentials.');
      sessionStorage.setItem('chalakgo_admin_token', data.token);
      setForm({ username: data.admin.username, currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Username and password updated. Use your new credentials for future logins.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  return <form className="card editor" onSubmit={save}><div className="form-head"><div><small>ACCOUNT SECURITY</small><h2>Admin username & password</h2><p>Confirm your current password to change your login. Other admin login sessions will need to sign in again.</p></div></div>
    <div className="grid">{[['New username','username','text','username'],['Current password','currentPassword','password','current-password'],['New password','newPassword','password','new-password'],['Confirm new password','confirmPassword','password','new-password']].map(([label,key,type,autoComplete]) => <label className="field" key={key}><span>{label}</span><input required type={type} autoComplete={autoComplete} minLength={key === 'username' ? 3 : key === 'currentPassword' ? 1 : 8} value={form[key]} disabled={busy} onChange={event => setForm(old => ({...old,[key]:event.target.value}))} /></label>)}</div>
    {message && <p role="status" className="empty">{message}</p>}<div className="form-footer"><button className="primary" disabled={busy}>{busy ? 'Updating...' : 'Update credentials'}</button></div>
  </form>;
}

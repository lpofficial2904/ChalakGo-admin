import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { API_BASE } from './utils/api.js'
import { idOf } from './utils/id.js'
import { notificationTones, soundPreferences, playNotificationSound } from './utils/notificationSound.js'

export default function AdminNotifications({ onOpen }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [soundReady, setSoundReady] = useState(false)
  const audio = useRef(null)
  const stopSound = useRef(() => {})
  const openRequest = useRef(onOpen)
  openRequest.current = onOpen
  const [storageKey] = useState(() => {
    try {
      const token = sessionStorage.getItem('chalakgo_admin_token')
      const user = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      return `chalakgo_notifications:${user.id || user.username || 'primary'}`
    } catch { return 'chalakgo_notifications:primary' }
  })
  const [sound, setSound] = useState(() => {
    try { return soundPreferences(JSON.parse(localStorage.getItem(`${storageKey}:sound`) || '{}')) }
    catch { return soundPreferences() }
  })
  const soundRef = useRef(sound)
  soundRef.current = sound
  const updateSound = changes => {
    const next = soundPreferences({ ...soundRef.current, ...changes })
    soundRef.current = next
    setSound(next)
    stopSound.current()
    try { localStorage.setItem(`${storageKey}:sound`, JSON.stringify(next)) }
    catch { toast.info('Sound settings apply to this session only. Browser storage is unavailable.') }
  }
  const unlockSound = async () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) throw Error('Sound is not supported in this browser.')
    if (!audio.current || audio.current.state === 'closed') {
      audio.current = new AudioContext()
      audio.current.onstatechange = () => setSoundReady(audio.current?.state === 'running')
    }
    await audio.current.resume()
    setSoundReady(audio.current.state === 'running')
    if (audio.current.state !== 'running') throw Error('Tap Enable sound to allow notification audio.')
  }
  const ring = () => {
    stopSound.current()
    if (soundRef.current.enabled && audio.current?.state === 'running') {
      stopSound.current = playNotificationSound(audio.current, soundRef.current)
    }
  }
  const [read, setRead] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]')
      return new Set(Array.isArray(saved) ? saved : [])
    } catch { return new Set() }
  })
  const [deleted, setDeleted] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`${storageKey}:deleted`) || '[]')
      return new Set(Array.isArray(saved) ? saved : [])
    } catch { return new Set() }
  })
  const deletedRef = useRef(deleted)
  deletedRef.current = deleted
  const deleteNotification = (id) => {
    const next = new Set([...deletedRef.current, id])
    deletedRef.current = next
    setDeleted(next)
    toast.dismiss(id)
    try { localStorage.setItem(`${storageKey}:deleted`, JSON.stringify([...next])) }
    catch { toast.info('Notification hidden for this session. Browser storage is unavailable.') }
  }
  useEffect(() => {
    const remove = event => deleteNotification(`${event.detail.kind}:${event.detail.id}`)
    window.addEventListener('admin-request-deleted', remove)
    return () => window.removeEventListener('admin-request-deleted', remove)
  }, [storageKey])
  const markRead = (ids) => setRead(current => {
    const next = new Set([...current, ...ids])
    try { localStorage.setItem(storageKey, JSON.stringify([...next].slice(-10000))) } catch { /* Storage may be disabled. */ }
    return next
  })
  const visit = (item) => {
    markRead([item.id])
    setOpen(false)
    openRequest.current(item.kind)
  }
  const visitRef = useRef(visit)
  visitRef.current = visit

  useEffect(() => {
    let stopped = false, timer, liveTimer, busy = false, pending = false
    const controller = new AbortController()
    const known = new Set()
    let initialized = false
    const poll = async () => {
      if (stopped) return
      if (busy) { pending = true; return }
      busy = true
      window.clearTimeout(timer)
      try {
        const lists = await Promise.all(['bookings', 'contacts'].map(async kind => {
          const response = await fetch(`${API_BASE}/api/${kind}/admin`, {
            credentials: 'include', signal: controller.signal,
            headers: { Authorization: `Bearer ${sessionStorage.getItem('chalakgo_admin_token')}` },
          })
          if (!response.ok) throw Error('Notifications unavailable. Retrying automatically.')
          const data = await response.json()
          return data.map(item => ({
            id: `${kind}:${idOf(item)}`, kind, createdAt: item.createdAt,
            title: kind === 'bookings' ? 'New service booking' : 'New contact message',
            message: kind === 'bookings' ? `${item.fullName} — ${item.service}` : `${item.name}: ${item.message}`,
          }))
        }))
        if (stopped) return
        const next = lists.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        const fresh = initialized ? next.filter(item => !known.has(item.id) && !deletedRef.current.has(item.id)) : []
        next.forEach(item => known.add(item.id))
        initialized = true
        setItems(next)
        setError('')
        if (fresh.length) {
          window.dispatchEvent(new Event('admin-requests-updated'))
          fresh.slice(0, 3).forEach(item => {
            toast.info(`${item.title}: ${item.message}`, {
              toastId: item.id, autoClose: 10000,
              onClick: () => visitRef.current(item),
            })
          })
          if (fresh.length > 3) toast.info(`${fresh.length - 3} more new requests. Open Notifications to view.`)
          ring()
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            try {
              const notification = new Notification('ChalakGo: new requests', {
                body: `${fresh.length} new booking/contact request(s). Open the admin panel to view.`, tag: 'chalakgo-requests',
              })
              notification.onclick = () => { window.focus(); visitRef.current(fresh[0]); notification.close() }
            } catch { /* Some mobile browsers require push notifications. */ }
          }
        }
      } catch (e) { if (!stopped) setError(e.message) }
      finally {
        busy = false
        if (!stopped) {
          const delay = pending ? 0 : 5000
          pending = false
          timer = window.setTimeout(poll, delay)
        }
      }
    }
    let revision = ''
    const listen = async () => {
      let retryDelay = 0
      try {
        const response = await fetch(`${API_BASE}/api/admin/events?since=${encodeURIComponent(revision)}`, {
          credentials: 'include', cache: 'no-store', signal: controller.signal,
          headers: { Authorization: `Bearer ${sessionStorage.getItem('chalakgo_admin_token')}` },
        })
        if (!response.ok) throw Error('Live connection unavailable')
        const data = await response.json()
        if (typeof data.revision !== 'string' || !data.revision) throw Error('Invalid live update')
        if (!stopped && data.revision !== revision) {
          revision = data.revision
          await poll()
        }
      } catch { retryDelay = 5000 }
      finally { if (!stopped) liveTimer = window.setTimeout(listen, retryDelay) }
    }
    // Establish the existing-record baseline before listening for new requests.
    poll().then(() => { if (!stopped) listen() })
    window.addEventListener('focus', poll)
    return () => {
      stopped = true
      controller.abort()
      window.clearTimeout(timer)
      window.clearTimeout(liveTimer)
      window.removeEventListener('focus', poll)
    }
  }, [])
  useEffect(() => {
    const resume = () => {
      if (soundRef.current.enabled) unlockSound().catch(() => {})
    }
    window.addEventListener('pointerdown', resume)
    window.addEventListener('keydown', resume)
    return () => {
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
      stopSound.current()
      if (audio.current) {
        audio.current.onstatechange = null
        audio.current.close().catch(() => {})
      }
    }
  }, [])
  const enableSound = async () => {
    updateSound({ enabled: true })
    try { await unlockSound(); ring() }
    catch (e) { toast.info(e.message) }
  }
  const testSound = async () => {
    try { await unlockSound(); ring() }
    catch (e) { toast.info(e.message) }
  }
  const enableAlerts = async () => {
    try {
      if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission()
      toast.info('Browser alerts depend on your browser permission. Sound is controlled separately below.')
    } catch { toast.info('Popup alerts are active. Your browser could not enable additional alerts.') }
  }
  const visibleItems = items.filter(item => !deleted.has(item.id))
  const unread = visibleItems.filter(item => !read.has(item.id)).length
  return <div className="admin-notifications">
    <button className="secondary" aria-expanded={open} aria-controls="admin-notification-list" onClick={() => setOpen(!open)}>
      Notifications <span className="notification-count" aria-live="polite">{unread}</span>
    </button>
    {open && <section id="admin-notification-list" className="notification-panel" aria-label="Notifications" onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }}>
      <div className="notification-heading"><strong>Bookings & messages</strong><button type="button" aria-label="Close notifications" onClick={() => setOpen(false)}>×</button></div>
      <div className="notification-actions">
        <button onClick={() => markRead(items.map(item => item.id))} disabled={!unread}>Mark all read</button>
        <button onClick={enableAlerts}>Enable browser alerts</button>
      </div>
      <fieldset className="notification-sound-settings">
        <legend>Notification sound</legend>
        <div className="notification-actions">
          <button type="button" onClick={sound.enabled ? () => updateSound({ enabled: false }) : enableSound} aria-pressed={sound.enabled}>
            {sound.enabled ? 'Turn sound off' : 'Turn sound on'}
          </button>
          <button type="button" onClick={testSound} disabled={!sound.enabled}>Test sound</button>
          {sound.enabled && !soundReady && <button type="button" onClick={enableSound}>Enable sound</button>}
        </div>
        <label>Bell tone<select value={sound.tone} onChange={event => updateSound({ tone: event.target.value })}>
          {Object.entries(notificationTones).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Volume: {sound.volume}%<input type="range" min="0" max="100" step="5" value={sound.volume} onChange={event => updateSound({ volume: Number(event.target.value) })} /></label>
        <small role="status">{!sound.enabled ? 'Sound off.' : !soundReady ? 'Tap Enable sound to allow audio in this browser.' : sound.volume === 0 ? 'Muted: increase the volume to hear notifications.' : 'Sound ready for new notifications.'} Settings are saved for this admin in this browser. Keep the panel open and device volume audible.</small>
      </fieldset>
      <small>Live updates while the admin panel is open, with a backup check every 5 seconds.</small>
      {error && <p role="status">{error}</p>}
      {!visibleItems.length && !error && <p>No notifications yet.</p>}
      <div className="notification-items">{visibleItems.map(item => <div key={item.id} className="notification-row"><button className={`notification-item ${read.has(item.id) ? '' : 'unread'}`} onClick={() => visit(item)}>
        <strong>{!read.has(item.id) && '● '}{item.title}</strong>
        <span>{item.message}</span>
        <small>{new Date(item.createdAt).toLocaleString()}</small>
      </button><button type="button" className="notification-delete" aria-label={`Delete notification: ${item.title} ${item.message}`} onClick={() => deleteNotification(item.id)}>Delete</button></div>)}</div>
    </section>}
  </div>
}

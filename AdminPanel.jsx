import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import './login.css'
import RequestsAdmin from './RequestsAdmin'
import ReviewsAdmin from './ReviewsAdmin'

const serviceEmpty = {
  name: '',
  slug: '',
  price: '',
  pricingType: 'hourly',
  suvRate: '',
  hatchbackRate: '',
  travellerRate: '',
  sixToEightRate: '',
  eightToTenRate: '',
  tenToTwelveRate: '',
  eyebrow: '',
  detail: '',
  features: '',
  image: '',
  tourPlans: '',
  isActive: true,
}
const pageEmpty = {
  title: '',
  slug: '',
  navigationLabel: '',
  heroTitle: '',
  excerpt: '',
  content: '',
  isPublished: true,
}
const websitePages = [
  ['Home', '/'],
  ['About', '/about'],
  ['Pricing', '/pricing'],
  ['Services', '/services'],
  ['Blog', '/blog'],
  ['Contact', '/contact'],
  ['How it works', '/how-it-works'],
  ['Fleet', '/fleet'],
  ['Reviews', '/reviews'],
  ['FAQs', '/faqs'],
]

const blogEmpty = () => ({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: '',
  author: 'ChalakGo Team',
  isPublished: true,
  publishedAt: new Date().toISOString().slice(0, 10),
})
const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
const idOf = (value) => {
  const id = value?._id ?? value
  if (typeof id === 'string' || typeof id === 'number') return String(id)
  if (id?.buffer)
    return Object.values(id.buffer)
      .map((byte) => Number(byte).toString(16).padStart(2, '0'))
      .join('')
  return id?.toString?.() || ''
}
const apiBase =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://chalakgo.onrender.com'
const websiteBase =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5174'
    : 'https://chalakgoo.netlify.app'
const api = async (path, options = {}) => {
  const token = sessionStorage.getItem('chalakgo_admin_token')
  const response = await fetch(`${apiBase}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  if (response.status === 204) return null
  const data = await response.json()
  if (!response.ok) throw Error(data.message || 'Request failed.')
  return data
}
const tokenExpiryDelay = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return Math.max(0, Number(payload.exp) * 1000 - Date.now())
  } catch {
    return 0
  }
}
const setFavicon = (url) => {
  if (!url) return
  let icon = document.querySelector("link[rel='icon']")
  if (!icon) {
    icon = document.createElement('link')
    icon.rel = 'icon'
    document.head.appendChild(icon)
  }
  icon.href = url
}

export default function AdminPanel({ initialTab = 'dashboard' }) {
  const [ready, setReady] = useState(false),
    [allowed, setAllowed] = useState(false),
    [tab, setTab] = useState(initialTab),
    [notice, setNotice] = useState(''),
    [services, setServices] = useState([]),
    [pages, setPages] = useState([]),
    [blogs, setBlogs] = useState([]),
    [settings, setSettings] = useState({}),
    [service, setService] = useState(serviceEmpty),
    [page, setPage] = useState(pageEmpty),
    [blog, setBlog] = useState(blogEmpty)
  const [mobileMenu, setMobileMenu] = useState(false)
  const load = async () => {
    if (!sessionStorage.getItem('chalakgo_admin_token')) return setReady(true)
    try {
      const me = await api('/api/auth/me')
      if (!me.admin) return
      const [sv, pg, bl, st] = await Promise.all([
        api('/api/services/admin'),
        api('/api/pages/admin/all'),
        api('/api/blogs/admin/all'),
        api('/api/settings'),
      ])
      setServices(sv)
      setPages(pg)
      setBlogs(bl)
      setSettings(st)
      setFavicon(st.adminFavicon)
      setAllowed(true)
    } catch {
      sessionStorage.removeItem('chalakgo_admin_token')
    } finally {
      setReady(true)
    }
  }
  useEffect(() => {
    load()
  }, [])
  useEffect(() => {
    const token = sessionStorage.getItem('chalakgo_admin_token')
    if (!token) return undefined
    const delay = tokenExpiryDelay(token)
    if (!delay) {
      sessionStorage.removeItem('chalakgo_admin_token')
      window.location.reload()
      return undefined
    }
    const timer = window.setTimeout(() => {
      sessionStorage.removeItem('chalakgo_admin_token')
      window.location.reload()
    }, delay)
    return () => window.clearTimeout(timer)
  }, [])
  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && setMobileMenu(false)
    window.addEventListener('keydown', closeOnEscape)
    document.body.classList.toggle('admin-menu-open', mobileMenu)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      document.body.classList.remove('admin-menu-open')
    }
  }, [mobileMenu])
  const save = async (event, kind, item, setItems, reset, list) => {
    event.preventDefault()
    try {
      const body = { ...item, slug: slugify(item.slug) }
      if (kind === 'service') {
        body.pricingType = item.pricingType || 'hourly'
        body.vehicleRates = {
          suv: Number(item.suvRate) || undefined,
          hatchback: Number(item.hatchbackRate) || undefined,
        }
        body.vehicleRates.traveller = Number(item.travellerRate) || undefined
        body.monthlyRates = {
          sixToEight: Number(item.sixToEightRate) || undefined,
          eightToTen: Number(item.eightToTenRate) || undefined,
          tenToTwelve: Number(item.tenToTwelveRate) || undefined,
        }
        body.features = String(item.features)
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean)
        body.tourPlans = Array.isArray(item.tourPlans)
          ? item.tourPlans
          : item.tourPlans
            ? JSON.parse(item.tourPlans)
            : []
      }
      const itemId = idOf(item)
      const result = itemId
        ? await api(`/api/${kind}s/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify(body),
          })
        : await api(`/api/${kind}s`, {
            method: 'POST',
            body: JSON.stringify(body),
          })
      setItems((items) =>
        itemId ? items.map((x) => (idOf(x) === idOf(result) ? result : x)) : [result, ...items]
      )
      reset()
      setTab(list)
      setNotice('Saved successfully.')
      toast.success('Saved successfully.')
    } catch (error) {
      setNotice(error.message)
      toast.error(error.message)
    }
  }
  const remove = async (kind, id, setItems) => {
    const itemId = idOf(id)
    if (!window.confirm('Delete this item?')) return
    try {
      await api(`/api/${kind}s/${itemId}`, { method: 'DELETE' })
      setItems((items) => items.filter((x) => idOf(x) !== itemId))
      setNotice('Deleted successfully.')
      toast.success('Deleted successfully.')
    } catch (error) {
      setNotice(error.message)
      toast.error(error.message)
    }
  }
  if (!ready) return <div className="admin-loading">Loading admin panel...</div>
  if (!allowed) return <Login />
  const title = {
    dashboard: 'Dashboard',
    services: 'Services',
    pages: 'Website pages',
    blogs: 'Blog posts',
    settings: 'Brand & contact',
    email: 'Email Notifications',
    whatsapp: 'WhatsApp API',
    reviews: 'Reviews',
    'service-form': service._id ? 'Edit service' : 'New service',
    'page-form': page._id ? 'Edit page' : 'New page',
    'blog-form': blog._id ? 'Edit blog post' : 'New blog post',
  }[tab]
  return (
    <div className={`admin-shell ${mobileMenu ? 'mobile-menu-open' : ''}`}>
      <header className="mobile-admin-header">
        <button
          className="mobile-menu-toggle"
          type="button"
          aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileMenu}
          onClick={() => setMobileMenu((value) => !value)}
        >
          {mobileMenu ? '×' : '☰'}
        </button>
        <strong>
          Chalak<span>Go</span> Admin
        </strong>
        <b className="avatar">A</b>
      </header>
      <button
        className="mobile-menu-backdrop"
        type="button"
        aria-label="Close navigation"
        onClick={() => setMobileMenu(false)}
      />
      <aside className="admin-sidebar">
        <div className="mobile-drawer-heading">
          <div>
            <strong>Admin Panel</strong>
            <span>Operations hub</span>
          </div>
          <button type="button" aria-label="Close navigation" onClick={() => setMobileMenu(false)}>×</button>
        </div>
        <div className="brand">
          {settings.footerLogo || settings.mainFavicon || settings.adminFavicon || settings.navbarLogo || settings.logo ? (
            <img
              src={settings.footerLogo || settings.mainFavicon || settings.adminFavicon || settings.navbarLogo || settings.logo}
              alt={`${settings.siteName || 'ChalakGo'} logo`}
              style={{ maxWidth: 170, maxHeight: 42, objectFit: 'contain', objectPosition: 'left' }}
            />
          ) : (
            <>
              <b>C</b> Chalak<span>Go</span>
            </>
          )}
        </div>
        <small>MANAGEMENT</small>
        <nav>
          {[
            ['dashboard', 'Dashboard'],
            ['requests', 'Bookings / Requests'],
            ['services', 'Services'],
            ['pages', 'Pages'],
            ['blogs', 'Blog'],
            ['settings', 'Brand & contact'],
            ['email', 'Email Notifications'],
            ['whatsapp', 'WhatsApp API'],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab.startsWith(id) ? 'active' : ''}
              onClick={() => {
                setTab(id)
                setMobileMenu(false)
              }}
            >
              <i>•</i>
              {label}
            </button>
          ))}
          <button
            className={tab === 'reviews' ? 'active' : ''}
            onClick={() => {
              setTab('reviews')
              setMobileMenu(false)
            }}
          >
            <i>•</i>
            Reviews
          </button>
        </nav>
        <div className="side-bottom">
          {/* <a href="http://localhost:5173" target="_blank" rel="noreferrer">
            View website
          </a> */}
          <button
            onClick={() =>
              api('/api/auth/logout', { method: 'POST' }).finally(() => {
                sessionStorage.removeItem('chalakgo_admin_token')
                window.location.reload()
              })
            }
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header>
          <div>
            <small>CONTENT CONTROL CENTER</small>
            <h1>{title}</h1>
          </div>
          <b className="avatar">A</b>
        </header>
        {notice && (
          <div className="notice">
            {notice}
            <button onClick={() => setNotice('')}>×</button>
          </div>
        )}
        {tab === 'dashboard' && (
          <Dashboard services={services} pages={pages} blogs={blogs} go={setTab} />
        )}
        {tab === 'requests' && <RequestsAdmin />}
        {tab === 'reviews' && <ReviewsAdmin embedded />}
        {tab === 'services' && (
          <List
            title="Services"
            action="+ Add service"
            items={services}
            add={() => {
              setService(serviceEmpty)
              setTab('service-form')
            }}
            edit={(item) => {
              setService({
                ...item,
                features: (item.features || []).join('\n'),
                suvRate: item.vehicleRates?.suv || '',
                hatchbackRate: item.vehicleRates?.hatchback || '',
                travellerRate: item.vehicleRates?.traveller || '',
                sixToEightRate: item.monthlyRates?.sixToEight || '',
                eightToTenRate: item.monthlyRates?.eightToTen || '',
                tenToTwelveRate: item.monthlyRates?.tenToTwelve || '',
                tourPlans: JSON.stringify(item.tourPlans || [], null, 2),
              })
              setTab('service-form')
            }}
            remove={(item) => remove('service', item._id, setServices)}
            label={(item) => item.name}
            sub={(item) => `/services/${item.slug}`}
            live={(item) => item.isActive}
          />
        )}
        {tab === 'pages' && (
          <WebsitePages
            pages={pages}
            add={() => {
              setPage(pageEmpty)
              setTab('page-form')
            }}
            edit={(item) => {
              setPage(item)
              setTab('page-form')
            }}
            remove={(item) => remove('page', item._id, setPages)}
            editStatic={(label, path) => {
              const slug = path === '/' ? 'home' : path.slice(1)
              setPage({ ...pageEmpty, title: label, slug, navigationLabel: label })
              setTab('page-form')
            }}
          />
        )}
        {tab === 'blogs' && (
          <List
            title="Blog posts"
            action="+ Add blog post"
            items={blogs}
            add={() => {
              setBlog(blogEmpty())
              setTab('blog-form')
            }}
            edit={(item) => {
              setBlog({
                ...item,
                publishedAt: item.publishedAt
                  ? new Date(item.publishedAt).toISOString().slice(0, 10)
                  : '',
              })
              setTab('blog-form')
            }}
            remove={(item) => remove('blog', item._id, setBlogs)}
            label={(item) => item.title}
            sub={(item) => `/blog/${item.slug}`}
            live={(item) => item.isPublished}
          />
        )}
        {tab === 'service-form' && (
          <Editor
            title="Service information"
            item={service}
            setItem={setService}
            submit={(event) =>
              save(
                event,
                'service',
                service,
                setServices,
                () => setService(serviceEmpty),
                'services'
              )
            }
            back={() => setTab('services')}
            fields={[
              ['Service name', 'name', true],
              ['URL slug', 'slug', true, '/services/'],
              ['Price', 'price'],
              ['Pricing type', 'pricingType'],
              ['SUV rate per km', 'suvRate'],
              ['Hatchback rate per km', 'hatchbackRate'],
              ['Haravan Traveller rate per km', 'travellerRate'],
              ['6–8 hours monthly rate', 'sixToEightRate'],
              ['8–10 hours monthly rate', 'eightToTenRate'],
              ['10–12 hours monthly rate', 'tenToTwelveRate'],
              ['Short heading', 'eyebrow'],
              ['Image URL', 'image', false, '', false, true],
              ['Description', 'detail', false, '', true, true],
              ['Features (one per line)', 'features', false, '', true, true],
              ['Tour plans (JSON)', 'tourPlans', false, '', true, true],
            ]}
            publishedKey="isActive"
          />
        )}
        {tab === 'page-form' && (
          <Editor
            title="Page content"
            item={page}
            setItem={setPage}
            submit={(event) =>
              save(event, 'page', page, setPages, () => setPage(pageEmpty), 'pages')
            }
            back={() => setTab('pages')}
            fields={[
              ['Page title', 'title', true],
              ['URL slug', 'slug', true, '/p/'],
              ['Menu label', 'navigationLabel'],
              ['Hero heading', 'heroTitle'],
              ['Introduction', 'excerpt', false, '', true, true],
              ['Page content', 'content', false, '', true, true],
            ]}
          />
        )}
        {tab === 'blog-form' && (
          <Editor
            title="Blog post"
            item={blog}
            setItem={setBlog}
            submit={(event) =>
              save(event, 'blog', blog, setBlogs, () => setBlog(blogEmpty()), 'blogs')
            }
            back={() => setTab('blogs')}
            fields={[
              ['Post title', 'title', true],
              ['URL slug', 'slug', true, '/blog/'],
              ['Author', 'author'],
              ['Publish date', 'publishedAt', false, '', false, false, 'date'],
              ['Cover image URL', 'coverImage', false, '', false, true],
              ['Introduction', 'excerpt', false, '', true, true],
              ['Article content', 'content', true, '', true, true],
            ]}
          />
        )}
        {tab === 'settings' && (
          <BrandForm settings={settings} setSettings={setSettings} setNotice={setNotice} />
        )}
        {tab === 'email' && <EmailNotifications settings={settings} setSettings={setSettings} setNotice={setNotice} />}
        {tab === 'whatsapp' && <WhatsAppSettings settings={settings} setSettings={setSettings} setNotice={setNotice} />}
      </main>
    </div>
  )
}
function Dashboard({ services, pages, blogs, go }) {
  return (
    <>
      <section className="stats">
        <Stat title="Total services" value={services.length} />
        <Stat title="Website pages" value={pages.length} />
        <Stat title="Blog posts" value={blogs.length} />
      </section>
      <section className="dash-grid">
        <article className="welcome">
          <small>WELCOME BACK</small>
          <h2>
            Your website is
            <br />
            ready to grow.
          </h2>
          <p>Manage every service, page, post, logo and business detail from one place.</p>
          <button onClick={() => go('service-form')}>Add a service →</button>
        </article>
        <article className="quick">
          <h2>Quick actions</h2>
          <button onClick={() => go('service-form')}>Add a service →</button>
          <button onClick={() => go('blog-form')}>Write a blog post →</button>
          <button onClick={() => go('settings')}>Update logo & name →</button>
        </article>
      </section>
    </>
  )
}

function WebsitePages({ pages, add, edit, remove, editStatic }) {
  return (
    <section className="card">
      <div className="list-head">
        <div>
          <small>MANAGE CONTENT</small>
          <h2>All website pages</h2>
          <p>Static pages are listed below. Custom pages can be edited from this panel.</p>
        </div>
        <button className="primary" onClick={add}>
          + Add page
        </button>
      </div>
      <div className="rows">
        {websitePages.map(([label, path]) => (
          <article className="row" key={path}>
            <i className="icon">•</i>
            <div className="copy">
              <b>{label}</b>
              <small>{path}</small>
            </div>
            <span className="status live">Live page</span>
            <div className="actions">
              <a href={`${websiteBase}${path}`} target="_blank" rel="noreferrer">View</a>
              <button onClick={() => editStatic(label, path)}>Edit</button>
            </div>
          </article>
        ))}
        {pages.map((item) => (
          <article className="row" key={idOf(item)}>
            <i className="icon">•</i>
            <div className="copy">
              <b>{item.title}</b>
              <small>/p/{item.slug}</small>
            </div>
            <span className={item.isPublished ? 'status live' : 'status'}>
              {item.isPublished ? 'Published' : 'Draft'}
            </span>
            <div className="actions">
              <button onClick={() => edit(item)}>Edit</button>
              <button onClick={() => remove(item)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
function Stat({ title, value }) {
  return (
    <article className="stat">
      <i>•</i>
      <div>
        <small>{title}</small>
        <b>{value}</b>
      </div>
    </article>
  )
}
function List({ title, action, items, add, edit, remove, label, sub, live }) {
  return (
    <section className="card">
      <div className="list-head">
        <div>
          <small>MANAGE CONTENT</small>
          <h2>{title}</h2>
        </div>
        <button className="primary" onClick={add}>
          {action}
        </button>
      </div>
      <div className="rows">
        {items.map((item) => (
          <article className="row" key={idOf(item)}>
            <i className="icon">•</i>
            <div className="copy">
              <b>{label(item)}</b>
              <small>{sub(item)}</small>
            </div>
            <span className={live(item) ? 'status live' : 'status'}>
              {live(item) ? 'Published' : 'Draft'}
            </span>
            <div className="actions">
              <button onClick={() => edit(item)}>Edit</button>
              <button onClick={() => remove(item)}>Delete</button>
            </div>
          </article>
        ))}
        {!items.length && <p className="empty">Nothing added yet.</p>}
      </div>
    </section>
  )
}
function Editor({ title, item, setItem, submit, back, fields, publishedKey = 'isPublished' }) {
  const set = (key, value) => setItem({ ...item, [key]: value })
  return (
    <form className="card editor" onSubmit={submit}>
      <div className="form-head">
        <div>
          <small>CONTENT EDITOR</small>
          <h2>{title}</h2>
          <p>Changes are applied to the website after saving.</p>
        </div>
        <button className="back" type="button" onClick={back}>
          Back to list
        </button>
      </div>
      <div className="grid">
        {fields.map(([label, key, required, prefix, area, wide, type]) => (
          <Field
            key={key}
            label={label}
            value={item[key]}
            required={required}
            prefix={prefix}
            area={area}
            wide={wide}
            type={type}
            onChange={(value) => {
              set(key, value)
              if ((key === 'name' || key === 'title') && !item._id) set('slug', slugify(value))
            }}
          />
        ))}
      </div>
      <Toggle
        checked={item[publishedKey]}
        onChange={(value) => set(publishedKey, value)}
        label="Publish on website"
      />
      <div className="form-footer">
        <button className="secondary" type="button" onClick={back}>
          Cancel
        </button>
        <button className="primary">Save changes</button>
      </div>
    </form>
  )
}
function BrandForm({ settings, setSettings, setNotice }) {
  const saveUploadedImage = async (updates) => {
    const nextSettings = { ...settings, ...updates }
    setSettings(nextSettings)
    const saved = await api('/api/settings', { method: 'PUT', body: JSON.stringify(nextSettings) })
    setSettings(saved)
    setFavicon(saved.adminFavicon)
    setNotice('Logo image uploaded and applied successfully.')
    toast.success('Logo image uploaded and applied successfully.')
  }
  const save = async (event) => {
    event.preventDefault()
    try {
      setSettings(
        await api('/api/settings', {
          method: 'PUT',
          body: JSON.stringify(settings),
        })
      )
      setNotice('Brand, contact and social links updated.')
      toast.success('Brand and contact settings updated.')
    } catch (error) {
      setNotice(error.message)
      toast.error(error.message)
    }
  }
  const set = (key, value) => setSettings({ ...settings, [key]: value })
  return (
    <form className="card editor" onSubmit={save}>
      <div className="form-head">
        <div>
          <small>WEBSITE SETTINGS</small>
          <h2>Brand, contact & social accounts</h2>
          <p>
            Upload one navbar logo and one shared footer/favicon image for the website and admin
            panel.
          </p>
        </div>
      </div>
      <div className="grid">
        <Field
          label="Website / business name"
          value={settings.siteName}
          required
          onChange={(value) => set('siteName', value)}
        />
        <Field
          label="Logo image URL"
          value={settings.logo}
          onChange={(value) => saveUploadedImage({ logo: value })}
        />
        <Field
          label="Website navbar logo image URL"
          value={settings.navbarLogo}
          onChange={(value) => saveUploadedImage({ navbarLogo: value })}
        />
        <Field
          label="Footer logo + both favicons image URL"
          value={settings.footerLogo || settings.mainFavicon || settings.adminFavicon}
          onChange={(value) =>
            saveUploadedImage({ footerLogo: value, mainFavicon: value, adminFavicon: value })
          }
        />
        <Field
          label="Homepage right-side image URL"
          value={settings.heroImage}
          onChange={(value) => saveUploadedImage({ heroImage: value })}
          wide
        />
        <Field
          label="Top bar message"
          value={settings.topBarMessage}
          onChange={(value) => set('topBarMessage', value)}
          wide
        />
        <Field
          label="Phone number"
          value={settings.phone}
          required
          onChange={(value) => set('phone', value)}
        />
        <Field
          label="Email address"
          value={settings.email}
          type="email"
          required
          onChange={(value) => set('email', value)}
        />
        <Field
          label="Contact form notification email"
          value={settings.contactEmail}
          type="email"
          required
          onChange={(value) => set('contactEmail', value)}
        />
        <Field
          label="Contact email subject"
          value={settings.contactEmailSubject}
          onChange={(value) => set('contactEmailSubject', value)}
          wide
        />
        <Field
          label="Contact email message template"
          value={settings.contactEmailMessage}
          onChange={(value) => set('contactEmailMessage', value)}
          area
          wide
        />
        <Field
          label="Facebook URL"
          value={settings.facebook}
          onChange={(value) => set('facebook', value)}
        />
        <Field
          label="Instagram URL"
          value={settings.instagram}
          onChange={(value) => set('instagram', value)}
        />
        <Field
          label="WhatsApp URL"
          value={settings.whatsapp}
          onChange={(value) => set('whatsapp', value)}
        />
        <Field
          label="LinkedIn URL"
          value={settings.linkedin}
          onChange={(value) => set('linkedin', value)}
        />
        <Field
          label="YouTube URL"
          value={settings.youtube}
          onChange={(value) => set('youtube', value)}
        />
        <Field
          label="Office address"
          value={settings.address}
          area
          wide
          onChange={(value) => set('address', value)}
        />
        <Field
          label="Email sender address"
          value={settings.otpEmailFrom}
          onChange={(value) => set('otpEmailFrom', value)}
          wide
        />
        <Field
          label="OTP email subject"
          value={settings.otpEmailSubject}
          onChange={(value) => set('otpEmailSubject', value)}
          wide
        />
        <Field
          label="SMTP host"
          value={settings.smtpHost}
          onChange={(value) => set('smtpHost', value)}
        />
        <Field
          label="SMTP port"
          value={settings.smtpPort || 587}
          type="number"
          onChange={(value) => set('smtpPort', value)}
        />
        <Field
          label="SMTP username / email"
          value={settings.smtpUser}
          onChange={(value) => set('smtpUser', value)}
        />
        <Field
          label={
            settings.smtpPassConfigured
              ? 'SMTP password (leave blank to keep current)'
              : 'SMTP password'
          }
          value={settings.smtpPass || ''}
          type="password"
          onChange={(value) => set('smtpPass', value)}
        />
        <Toggle
          checked={Boolean(settings.smtpSecure)}
          onChange={(value) => set('smtpSecure', value)}
          label="Use secure SMTP connection (usually port 465)"
        />
        <div className={`email-status ${settings.emailDeliveryConfigured ? 'ready' : 'missing'}`}>
          <b>
            {settings.emailDeliveryConfigured ? 'Email OTP is ready' : 'Email OTP needs SMTP setup'}
          </b>
          <span>
            {settings.emailDeliveryConfigured
              ? 'Nodemailer can send login OTPs.'
              : 'Add SMTP_HOST, SMTP_USER and SMTP_PASS to backend/.env, then restart the backend.'}
          </span>
        </div>
      </div>
      <div className="form-footer">
        <button className="primary">Save changes</button>
      </div>
    </form>
  )
}

function NotificationEditor({ title, eyebrow, settings, setSettings, setNotice, children }) {
  const save = async (event) => {
    event.preventDefault()
    try {
      const saved = await api('/api/settings', { method: 'PUT', body: JSON.stringify(settings) })
      setSettings(saved)
      setNotice(`${title} settings saved.`)
      toast.success(`${title} settings saved.`)
    } catch (error) {
      setNotice(error.message)
      toast.error(error.message)
    }
  }
  const set = (key, value) => setSettings({ ...settings, [key]: value })
  return (
    <form className="card editor" onSubmit={save}>
      <div className="form-head"><div><small>{eyebrow}</small><h2>{title}</h2><p>Changes apply to new notifications after saving.</p></div></div>
      <div className="grid">{children(set)}</div>
      <div className="form-footer"><button className="primary">Save changes</button></div>
    </form>
  )
}

function EmailNotifications({ settings, setSettings, setNotice }) {
  return <NotificationEditor title="Email Notifications" eyebrow="EMAIL CONTROL" settings={settings} setSettings={setSettings} setNotice={setNotice}>
    {(set) => <>
      <NotificationSection title="Booking form email" description="Booking form details will be sent to this email address.">
        <Toggle checked={settings.bookingEmailEnabled !== false} onChange={(value) => set('bookingEmailEnabled', value)} label="Enable booking emails" />
        <Field label="Booking notification email" value={settings.bookingEmail} type="email" onChange={(value) => set('bookingEmail', value)} />
        <Field label="Booking email subject" value={settings.bookingEmailSubject} onChange={(value) => set('bookingEmailSubject', value)} wide />
      </NotificationSection>
      <NotificationSection title="Contact form email" description="Contact form details will be sent to this email address.">
        <Toggle checked={settings.contactEmailEnabled !== false} onChange={(value) => set('contactEmailEnabled', value)} label="Enable contact emails" />
        <Field label="Contact notification email" value={settings.contactEmail} type="email" onChange={(value) => set('contactEmail', value)} />
        <Field label="Contact email subject" value={settings.contactEmailSubject} onChange={(value) => set('contactEmailSubject', value)} wide />
        <Field label="Contact message template" value={settings.contactEmailMessage} onChange={(value) => set('contactEmailMessage', value)} area wide />
      </NotificationSection>
      <NotificationSection title="Email OTP" description="OTP is delivered to the email entered by the user during login.">
        <Toggle checked={settings.emailOtpEnabled !== false} onChange={(value) => set('emailOtpEnabled', value)} label="Enable email OTP login" />
        <Field label="OTP sender email" value={settings.otpEmailFrom} type="email" onChange={(value) => set('otpEmailFrom', value)} />
        <Field label="OTP email subject" value={settings.otpEmailSubject} onChange={(value) => set('otpEmailSubject', value)} wide />
      </NotificationSection>
    </>}
  </NotificationEditor>
}

function NotificationSection({ title, description, children }) {
  return <section className="notification-section"><h3>{title}</h3><p>{description}</p><div className="grid">{children}</div></section>
}

function WhatsAppSettings({ settings, setSettings, setNotice }) {
  return <NotificationEditor title="WhatsApp API" eyebrow="WHATSAPP CLOUD API" settings={settings} setSettings={setSettings} setNotice={setNotice}>
    {(set) => <>
      <Toggle checked={Boolean(settings.whatsappEnabled)} onChange={(value) => set('whatsappEnabled', value)} label="Send booking and contact notifications on WhatsApp" />
      <Field label="Graph API version" value={settings.whatsappApiVersion || 'v21.0'} onChange={(value) => set('whatsappApiVersion', value)} />
      <Field label="WhatsApp Phone Number ID" value={settings.whatsappPhoneNumberId} onChange={(value) => set('whatsappPhoneNumberId', value)} />
      <Field label="WhatsApp recipient number (country code, no +)" value={settings.whatsappRecipient} onChange={(value) => set('whatsappRecipient', value)} />
      <Field label={settings.whatsappTokenConfigured ? 'Permanent access token (leave blank to keep current)' : 'Permanent access token'} value={settings.whatsappAccessToken || ''} type="password" onChange={(value) => set('whatsappAccessToken', value)} wide />
      <div className={`email-status ${settings.whatsappConfigured ? 'ready' : 'missing'}`}><b>{settings.whatsappConfigured ? 'WhatsApp API is ready' : 'WhatsApp API needs setup'}</b><span>Use a Meta WhatsApp Cloud API phone number ID, permanent token, and recipient number.</span></div>
    </>}
  </NotificationEditor>
}
function Field({ label, value, onChange, required, prefix, area, wide, type = 'text' }) {
  const [uploading, setUploading] = useState(false),
    [error, setError] = useState('')
  const isImage = /image url/i.test(label)
  const pickImage = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const token = sessionStorage.getItem('chalakgo_admin_token'),
        body = new FormData()
      body.append('image', file)
      const response = await fetch(`${apiBase}/api/uploads`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      })
      const data = await response.json()
      if (!response.ok) throw Error(data.message || 'Image upload failed.')
      await onChange(`${apiBase}${data.url}`)
      toast.success('Image uploaded successfully.')
    } catch (uploadError) {
      setError(uploadError.message)
      toast.error(uploadError.message)
    } finally {
      setUploading(false)
    }
  }
  if (isImage)
    return (
      <label className={`field ${wide ? 'wide' : ''}`}>
        <span>{label.replace(' URL', '')} — upload from computer</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={pickImage}
          disabled={uploading}
        />
        {uploading && <small>Uploading…</small>}
        {error && <small>{error}</small>}
        {value && (
          <img
            style={{
              maxHeight: 150,
              maxWidth: '100%',
              marginTop: 10,
              borderRadius: 8,
            }}
            src={value}
            alt="Uploaded preview"
          />
        )}
      </label>
    )
  return (
    <label className={`field ${wide ? 'wide' : ''} ${area ? 'tall' : ''}`}>
      <span>{label}</span>
      <div className={prefix ? 'prefixed' : ''}>
        {prefix && <em>{prefix}</em>}
        {area ? (
          <textarea
            value={value || ''}
            required={required}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <input
            type={type}
            value={value || ''}
            required={required}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      </div>
    </label>
  )
}
function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i></i>
      <span>
        <b>{label}</b>
        <small>Visible to visitors on the website</small>
      </span>
    </label>
  )
}
function Login() {
  const [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [message, setMessage] = useState(''),
    [saving, setSaving] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await response.json()
      if (!response.ok) throw Error(data.message)
      sessionStorage.setItem('chalakgo_admin_token', data.token)
      window.location.reload()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <main className="admin-loading admin-login">
      <form className="card editor" onSubmit={submit}>
        <div className="form-head">
          <div>
            <small>ADMIN ACCESS</small>
            <h2>Admin login</h2>
            <p>Use the username and password configured in backend/.env.</p>
          </div>
        </div>
        <div className="grid">
          <Field label="Username" value={username} required onChange={setUsername} />
          <Field
            label="Password"
            value={password}
            type="password"
            required
            onChange={setPassword}
          />
        </div>
        {message && <p className="empty">{message}</p>}
        <div className="form-footer">
          <button className="primary" disabled={saving}>
            {saving ? 'Please wait...' : 'Login'}
          </button>
        </div>
      </form>
    </main>
  )
}

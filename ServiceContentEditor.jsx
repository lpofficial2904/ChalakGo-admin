import { contentOf } from './shared/serviceContent.js'

export default function ServiceContentEditor({ service, onChange }) {
  const content = contentOf(service)
  return <section className="service-content-editor field wide">
    <h3>Service page content</h3>
    <p>Edit the information shown below the service banner. Benefits: one “Title | Description” per line.</p>
    {Object.entries(content).map(([key, value]) => <label className="field" key={key}>
      <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}</span>
      <textarea value={value ?? ''} rows={3} onChange={event => onChange({ ...content, [key]: event.target.value })} />
    </label>)}
    <label className="field"><span>Additional content (all services)</span>
      <textarea rows={7} value={service.content || ''} onChange={event => onChange(content, event.target.value)} placeholder="Add detailed service information, inclusions or terms." />
    </label>
  </section>
}

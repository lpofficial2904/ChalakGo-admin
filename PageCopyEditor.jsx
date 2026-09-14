import defaults from '../shared/pageCopy.json';
export default function PageCopyEditor({page,onChange}) {
 const original=defaults[page.slug] || {};
 return <section className="service-content-editor"><h3>Current page content</h3><p>Edit the text below. The existing page layout and forms stay in place.</p>{Object.entries({...original,...page.copy}).filter(([key])=>key !== "heroImage").map(([key,value],index)=><label className="field" key={key}><span>{index+1}. {original[key] || key}</span><textarea rows={String(value).length>100?4:2} value={page.copy?.[key] ?? value} onChange={event=>onChange({...original,...page.copy,[key]:event.target.value})}/></label>)}</section>;
}

export const builtInPages = ['home', 'about', 'pricing', 'services', 'blog', 'contact', 'how-it-works', 'fleet', 'reviews', 'faqs', 'terms-and-conditions'];
export function periodStarts(now = new Date()) {
  const offset = 330 * 60000;
  const local = new Date(now.getTime() + offset);
  const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return { today: new Date(day - offset), week: new Date(day - ((local.getUTCDay() + 6) % 7) * 86400000 - offset), month: new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - offset) };
}
export function publicationCounts(items, key) {
  const active = items.filter(item => item[key] !== false).length;
  return { total: items.length, active, inactive: items.length - active };
}
export function pageCounts(pages) {
  const records = new Map(builtInPages.map(slug => [slug, { slug, isPublished: true }]));
  pages.forEach(page => records.set(page.slug, page));
  return publicationCounts([...records.values()], 'isPublished');
}

export function bookingAmounts(bookings, now = new Date()) {
  const starts = periodStarts(now);
  const empty = () => ({ amount: 0, count: 0, missing: 0 });
  const periods = Object.fromEntries(['total', 'today', 'week', 'month'].map(key => [key, empty()]));
  const daily = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(starts.today.getTime() - index * 86400000);
    return { ...empty(), start: start.toISOString(), date: new Date(start.getTime() + 330 * 60000).toISOString().slice(0, 10) };
  });
  for (const booking of bookings) {
    const created = new Date(booking.createdAt).getTime();
    if (!Number.isFinite(created) || created > now.getTime()) continue;
    const fare = booking.totalFare;
    const valid = (typeof fare === 'number' || (typeof fare === 'string' && fare.trim() !== '')) && Number.isFinite(Number(fare)) && Number(fare) >= 0;
    const add = bucket => {
      bucket.count += 1;
      if (valid) bucket.amount += Math.round(Number(fare) * 100);
      else bucket.missing += 1;
    };
    add(periods.total);
    for (const [key, start] of Object.entries(starts)) if (created >= start.getTime()) add(periods[key]);
    const day = daily.find(row => created >= Date.parse(row.start) && created < Date.parse(row.start) + 86400000);
    if (day) add(day);
  }
  for (const bucket of [...Object.values(periods), ...daily]) bucket.amount /= 100;
  return { periods, daily };
}

export function nextTourDay(plans) {
  const used = new Set(plans.map(plan => Number(plan.days)));
  let day = 1;
  while (used.has(day)) day++;
  return day;
}

export function prepareTourPlans(plans) {
  if (!Array.isArray(plans)) throw new Error("Reopen this service and edit plans using the tour plan fields.");
  const days = new Set();
  return plans.map((plan, index) => {
    const day = Number(plan.days);
    if (!Number.isInteger(day) || day < 1 || days.has(day)) throw new Error(`Plan ${index + 1}: enter a unique positive number of days.`);
    days.add(day);
    if (!String(plan.title || "").trim()) throw new Error(`Plan ${index + 1}: enter a title.`);
    return { ...plan, days: day, title: String(plan.title).trim(), places: (Array.isArray(plan.places) ? plan.places : String(plan.places || "").split("\n")).map(place => String(place).trim()).filter(Boolean) };
  });
}

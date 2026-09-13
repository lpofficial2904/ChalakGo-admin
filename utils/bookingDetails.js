const first = (...values) => values.find(value => value !== undefined && value !== null && value !== "");

export function bookingDetails(booking) {
  const pickup = booking.pickup || {};
  const dateTime = (combined, date, time) => combined || [date, time].filter(Boolean).join(" ");
  const rows = [
    ["Full name", booking.fullName],
    ["Mobile number", booking.phone],
    ["Email address", booking.email],
    ["Service", booking.service],
    ["Car type", booking.carType],
    ["Duration / tour plan", first(booking.duration, booking.tourPlanDays ? `${booking.tourPlanDays} day tour` : undefined)],
    ["Trip distance (km)", booking.distanceKm],
    ["Start date & time", dateTime(booking.startDateTime, booking.startDate, booking.startTime)],
    ["End date & time", dateTime(booking.endDateTime, booking.endDate, booking.endTime)],
    ["Pickup location", first(booking.pickupAddress, booking.pickupLocation, pickup.formattedAddress, booking.address)],
  ];
  // Show each entered address field once, regardless of the backend's aliases.
  if (pickup.source !== "current" && booking.locationSource !== "gps") {
    for (const [label, key, legacy, top] of [
      ["House / flat number", "houseNumber", "pickupHouseNumber"],
      ["Apartment / building", "buildingName", "pickupBuildingName"],
      ["Street / road", "road", "pickupRoad", "mainRoad"],
      ["Neighbourhood", "neighbourhood"], ["Suburb", "suburb"],
      ["Locality", "locality"], ["Area", "area", "pickupArea"],
      ["City / town / village", "city", "pickupCity"], ["District", "district"],
      ["State", "state", "pickupState"], ["Pincode", "pincode", "pickupPincode"],
      ["Country", "country", "pickupCountry"],
    ]) rows.push([label, first(pickup[key], booking[legacy], booking[top], booking[key])]);
  }
  return rows.filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => [label, String(value).replace(/(\d{4}-\d{2}-\d{2})T/, "$1 ")]);
}

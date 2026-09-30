import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingAmounts } from './dashboard.js';

test('daily amounts use IST midnight, saved fares and exclude future bookings', () => {
 const now = new Date('2026-09-30T12:00:00Z');
 const result = bookingAmounts([
  {createdAt:'2026-09-29T18:29:59Z',totalFare:100},
  {createdAt:'2026-09-29T18:30:00Z',totalFare:250.25},
  {createdAt:'2026-09-30T11:00:00Z',totalFare:0},
  {createdAt:'2026-09-30T11:00:00Z'},
  {createdAt:'2026-09-30T11:00:00Z',totalFare:''},
  {createdAt:'2026-09-30T13:00:00Z',totalFare:900},
  {createdAt:'invalid',totalFare:100},
 ],now);
 assert.deepEqual(result.periods.today,{amount:250.25,count:4,missing:2});
 assert.equal(result.daily[0].date,'2026-09-30');
 assert.equal(result.daily[1].amount,100);
 assert.equal(result.periods.total.amount,350.25);
 assert.equal(result.daily.length,7);
});
test('period totals work across years and sum fractional rupees accurately', () => {
 const result = bookingAmounts([
  {createdAt:'2025-12-31T18:30:00Z',totalFare:0.1},
  {createdAt:'2026-01-01T00:00:00Z',totalFare:0.2},
  {createdAt:'2025-12-30T00:00:00Z',totalFare:10},
 ],new Date('2026-01-01T01:00:00Z'));
 assert.equal(result.periods.month.amount,0.3);
 assert.equal(result.periods.week.amount,10.3);
 assert.deepEqual(bookingAmounts([],new Date()).periods.today,{amount:0,count:0,missing:0});
});

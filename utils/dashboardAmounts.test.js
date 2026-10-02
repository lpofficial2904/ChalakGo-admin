import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingAmounts } from './dashboard.js';

test('daily amounts use IST midnight, saved fares and exclude future bookings', () => {
 const now = new Date('2026-09-30T12:00:00Z');
 const result = bookingAmounts([
  {status:'completed',completedAt:'2026-09-29T18:29:59Z',createdAt:'2026-09-20T00:00:00Z',totalFare:100},
  {status:'completed',completedAt:'2026-09-29T18:30:00Z',createdAt:'2026-09-20T00:00:00Z',totalFare:250.25},
  {status:'completed',completedAt:'2026-09-30T11:00:00Z',totalFare:0},
  {status:'completed',completedAt:'2026-09-30T11:00:00Z'},
  {status:'completed',completedAt:'2026-09-30T11:00:00Z',totalFare:''},
  {status:'completed',completedAt:'2026-09-30T13:00:00Z',totalFare:900},
  {status:'completed',completedAt:'invalid',totalFare:100},
  {status:'pending',createdAt:'2026-09-30T10:00:00Z',totalFare:5000},
  {status:'cancelled',createdAt:'2026-09-30T10:00:00Z',totalFare:6000},
 ],now);
 assert.deepEqual(result.periods.today,{amount:250.25,count:4,missing:2});
 assert.equal(result.daily[0].date,'2026-09-30');
 assert.equal(result.daily[1].amount,100);
 assert.equal(result.periods.total.amount,350.25);
 assert.equal(result.daily.length,7);
});
test('period totals work across years and sum fractional rupees accurately', () => {
 const result = bookingAmounts([
  {status:'completed',completedAt:'2025-12-31T18:30:00Z',totalFare:0.1},
  {status:'completed',completedAt:'2026-01-01T00:00:00Z',totalFare:0.2},
  {status:'completed',completedAt:'2025-12-30T00:00:00Z',totalFare:10},
 ],new Date('2026-01-01T01:00:00Z'));
 assert.equal(result.periods.month.amount,0.3);
 assert.equal(result.periods.week.amount,10.3);
 assert.deepEqual(bookingAmounts([],new Date()).periods.today,{amount:0,count:0,missing:0});
});

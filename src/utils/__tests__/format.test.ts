import {
  formatCount, formatIndianNumber, formatMoney, formatMoneyCompact, formatPhone, initials,
} from '../format';
import { countdownLabel, daysUntil, formatDate, formatTime, toISODate } from '../date';

describe('Indian number formatting (spec §27)', () => {
  it('groups in lakhs and crores, not thousands', () => {
    expect(formatIndianNumber(1001)).toBe('1,001');
    expect(formatIndianNumber(21500)).toBe('21,500');
    expect(formatIndianNumber(215000)).toBe('2,15,000');
    expect(formatIndianNumber(845500)).toBe('8,45,500');
    expect(formatIndianNumber(12345678)).toBe('1,23,45,678');
  });

  it('handles small values and zero', () => {
    expect(formatIndianNumber(0)).toBe('0');
    expect(formatIndianNumber(7)).toBe('7');
    expect(formatIndianNumber(999)).toBe('999');
  });

  it('puts a negative sign before the rupee symbol, not after it', () => {
    expect(formatMoney(-205512)).toBe('-₹2,05,512');
    expect(formatMoney(1001)).toBe('₹1,001');
  });

  it('compacts large amounts and keeps the sign', () => {
    expect(formatMoneyCompact(845500)).toBe('₹8.46L');
    expect(formatMoneyCompact(-845500)).toBe('-₹8.46L');
    expect(formatMoneyCompact(12345678)).toBe('₹1.23Cr');
    // Below a lakh it stays exact rather than rounding.
    expect(formatMoneyCompact(21500)).toBe('₹21,500');
  });

  it('compacts counts', () => {
    expect(formatCount(486)).toBe('486');
    expect(formatCount(1240)).toBe('1.2K');
  });
});

describe('names and phones', () => {
  it('builds initials from one or two names', () => {
    expect(initials('Murugan')).toBe('MU');
    expect(initials('Ravi Kumar')).toBe('RK');
    expect(initials('R. Murugan')).toBe('RM');
    expect(initials('  ')).toBe('?');
  });

  it('formats Indian mobile numbers, leaving others alone', () => {
    expect(formatPhone('9876543210')).toBe('98765 43210');
    expect(formatPhone('919876543210')).toBe('+91 98765 43210');
    expect(formatPhone('123')).toBe('123');
    expect(formatPhone(undefined)).toBe('');
  });
});

describe('dates', () => {
  it('converts to an ISO date in local time, not UTC', () => {
    // A late-evening local time must not roll over to the next day.
    const d = new Date(2026, 6, 28, 23, 30);
    expect(toISODate(d)).toBe('2026-07-28');
  });

  it('formats dates and times for display', () => {
    expect(formatDate('2026-07-28')).toBe('28 Jul 2026');
    expect(formatTime('2026-07-28T10:30:00')).toBe('10:30 AM');
    expect(formatTime('2026-07-28T00:05:00')).toBe('12:05 AM');
    expect(formatTime('2026-07-28T13:05:00')).toBe('1:05 PM');
  });

  it('counts whole days regardless of the time of day', () => {
    const from = new Date(2026, 6, 18, 23, 0);
    expect(daysUntil('2026-07-28', from)).toBe(10);
    expect(daysUntil('2026-07-18', from)).toBe(0);
    expect(daysUntil('2026-07-17', from)).toBe(-1);
  });

  it('describes the countdown in words', () => {
    const from = new Date(2026, 6, 18, 9, 0);
    expect(countdownLabel('2026-07-18', from)).toBe('Today');
    expect(countdownLabel('2026-07-19', from)).toBe('Tomorrow');
    expect(countdownLabel('2026-07-28', from)).toBe('10 Days Left');
    expect(countdownLabel('2026-07-17', from)).toBe('Yesterday');
    expect(countdownLabel('2026-07-08', from)).toBe('10 Days Ago');
  });
});

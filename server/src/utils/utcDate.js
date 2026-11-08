/**
 * UTC Date & Reset Utilities for SkillVault Quota and Daily Budget Tracking.
 * SkillVault daily usage counters and budgets reset strictly at 00:00 UTC.
 */

/**
 * Returns a UTC day string in 'YYYY-MM-DD' format.
 *
 * @param {Date|number|string} [date=new Date()]
 * @returns {string} Formatted UTC day string, e.g. '2026-10-25'
 */
export function getUtcDayString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new TypeError('Invalid date provided to getUtcDayString');
  }

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Returns a Date object representing 00:00:00.000 UTC for the given date.
 *
 * @param {Date|number|string} [date=new Date()]
 * @returns {Date}
 */
export function getUtcStartOfDay(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new TypeError('Invalid date provided to getUtcStartOfDay');
  }

  return new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    0, 0, 0, 0
  ));
}

/**
 * Returns a Date object representing 23:59:59.999 UTC for the given date.
 *
 * @param {Date|number|string} [date=new Date()]
 * @returns {Date}
 */
export function getUtcEndOfDay(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new TypeError('Invalid date provided to getUtcEndOfDay');
  }

  return new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    23, 59, 59, 999
  ));
}

/**
 * Returns the exact Date of the next 00:00:00.000 UTC reset.
 *
 * @param {Date|number|string} [date=new Date()]
 * @returns {Date}
 */
export function getUtcNextReset(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new TypeError('Invalid date provided to getUtcNextReset');
  }

  return new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + 1,
    0, 0, 0, 0
  ));
}

/**
 * Returns remaining milliseconds until the next 00:00:00.000 UTC reset.
 *
 * @param {Date|number|string} [date=new Date()]
 * @returns {number} Milliseconds (always non-negative)
 */
export function getMsUntilUtcReset(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new TypeError('Invalid date provided to getMsUntilUtcReset');
  }

  const nextReset = getUtcNextReset(d);
  return Math.max(0, nextReset.getTime() - d.getTime());
}

/**
 * Validates whether a string is a valid 'YYYY-MM-DD' calendar date.
 *
 * @param {string} str
 * @returns {boolean}
 */
export function isValidUtcDayString(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return false;
  }

  const [yearStr, monthStr, dayStr] = str.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

export default {
  getUtcDayString,
  getUtcStartOfDay,
  getUtcEndOfDay,
  getUtcNextReset,
  getMsUntilUtcReset,
  isValidUtcDayString
};

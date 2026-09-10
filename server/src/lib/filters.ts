import type { FilterQuery } from '../schemas/index.js';

/** Turns the shared filter shape into one Mongo match stage. */
export function buildMatch(filter: FilterQuery): Record<string, unknown> {
  const match: Record<string, unknown> = {};

  if (filter.type) match.type = filter.type;
  if (filter.category?.length) match.category = { $in: filter.category };

  if (filter.from || filter.to) {
    match.date = {
      ...(filter.from ? { $gte: filter.from } : {}),
      ...(filter.to ? { $lte: endOfDay(filter.to) } : {}),
    };
  }

  if (filter.q) {
    // The search box is a plain substring match, so neutralise regex syntax
    // before it reaches Mongo.
    const safe = filter.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    match.$or = [
      { note: { $regex: safe, $options: 'i' } },
      { category: { $regex: safe, $options: 'i' } },
    ];
  }

  return match;
}

/** A "to" date of 2026-09-30 must include everything that happened that day. */
export function endOfDay(date: Date): Date {
  const end = new Date(date);
  if (end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0) {
    end.setHours(23, 59, 59, 999);
  }
  return end;
}

/**
 * The window immediately before the current one, same length. Used to show
 * "spending is up 12% on last month" without the client doing date maths.
 */
export function previousWindow(from?: Date, to?: Date): { from: Date; to: Date } | null {
  if (!from || !to) return null;
  const end = endOfDay(to);
  const span = end.getTime() - from.getTime();
  if (span <= 0) return null;
  return { from: new Date(from.getTime() - span - 1), to: new Date(from.getTime() - 1) };
}

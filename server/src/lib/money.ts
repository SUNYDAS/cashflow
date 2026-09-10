/**
 * Money is stored and computed in integer cents so splits never drift.
 *
 * Splitting 100 cents three ways cannot be done exactly, so we use the
 * largest-remainder method: everyone gets the floor of their fair share and
 * the leftover cents go to whoever was rounded down hardest. The result always
 * sums back to the original total.
 */
export function allocate(totalCents: number, weights: number[]): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum <= 0) throw new Error('weights must sum to a positive number');

  const exact = weights.map((w) => (totalCents * w) / weightSum);
  const amounts = exact.map(Math.floor);

  let remainder = totalCents - amounts.reduce((a, b) => a + b, 0);
  const byLargestFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; remainder > 0; i++, remainder--) {
    const target = byLargestFraction[i % byLargestFraction.length]!;
    amounts[target.index]! += 1;
  }
  return amounts;
}

/** Equal split across N members. */
export const splitEqually = (totalCents: number, count: number) =>
  allocate(totalCents, new Array(count).fill(1));

export const toCents = (amount: number) => Math.round(amount * 100);
export const toDecimal = (cents: number) => cents / 100;

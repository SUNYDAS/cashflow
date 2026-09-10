/** CLI: reset the configured database to the demo dataset. */
import './lib/env.js';
import { connectDb, disconnectDb } from './db.js';
import { seedDemoData } from './seed-data.js';
import { TransactionModel } from './models/transaction.model.js';

async function main() {
  await connectDb(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/cost-analysis');

  // Seeding deletes everything first. Once there are real entries in here that
  // is unrecoverable, so make the destructive case deliberate rather than a
  // stray `npm run seed`.
  const existing = await TransactionModel.countDocuments();
  if (existing > 0 && !process.argv.includes('--force')) {
    console.error(`\nRefusing to seed: ${existing} transaction(s) already exist.`);
    console.error('Seeding DELETES them all and replaces them with demo data.');
    console.error('If that is really what you want: npm run seed -- --force\n');
    await disconnectDb();
    process.exit(1);
  }

  const summary = await seedDemoData();

  console.log(`\nSeeded ${summary.count} transactions across ${summary.months} months`);
  console.log(`  income   ${summary.income.toFixed(2)}`);
  console.log(`  expense  ${summary.expense.toFixed(2)}`);
  console.log(`  savings  ${summary.savings.toFixed(2)}\n`);

  await disconnectDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

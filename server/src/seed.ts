/** CLI: reset the configured database to the demo dataset. */
import 'dotenv/config';
import { connectDb, disconnectDb } from './db.js';
import { seedDemoData } from './seed-data.js';

async function main() {
  await connectDb(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/cost-analysis');
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

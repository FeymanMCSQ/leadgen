import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

async function verify() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const [leadCount, runCount] = await Promise.all([
      prisma.businessLead.count(),
      prisma.searchRun.count(),
    ]);
    console.log('✅ Connected.');
    console.log(`   BusinessLeads: ${leadCount}`);
    console.log(`   SearchRuns:    ${runCount}`);
  } catch (err) {
    console.error('❌ Connection failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verify();

import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed a SearchRun so the DB has at least one record
  const run = await prisma.searchRun.create({
    data: {
      mode: 'nearby',
      areaLabel: 'Kensington NSW (seed)',
      centerLat: -33.9173,
      centerLng: 151.2313,
      radiusMeters: 1000,
      includedTypes: ['barber_shop', 'hair_salon'],
      rawResultsCount: 2,
      completedAt: new Date(),
    },
  });

  // Seed two BusinessLeads linked to that run
  const leads = [
    {
      googlePlaceId: 'seed_ChIJbarber001',
      name: "Bob's Barber Shop",
      normalizedName: 'bobs barber shop',
      primaryType: 'barber_shop',
      categoryBucket: 'Beauty',
      formattedAddress: '12 Anzac Parade, Kensington NSW 2033',
      suburb: 'Kensington',
      latitude: -33.9175,
      longitude: 151.2315,
      source: 'GOOGLE_NEARBY' as const,
      sourceQuery: 'barber_shop near Kensington NSW (seed)',
      hasWebsite: false,
      hasPhone: true,
      nationalPhoneNumber: '+61 2 9312 0001',
      rating: 4.7,
      userRatingCount: 85,
      leadStatus: 'TODO' as const,
      leadScore: 75,
      cleaningReasons: ['No website — phone available for direct call'],
      lastImportedAt: new Date(),
    },
    {
      googlePlaceId: 'seed_ChIJsalon002',
      name: 'Style Studio',
      normalizedName: 'style studio',
      primaryType: 'hair_salon',
      categoryBucket: 'Beauty',
      formattedAddress: '45 Doncaster Ave, Kensington NSW 2033',
      suburb: 'Kensington',
      latitude: -33.9182,
      longitude: 151.2310,
      source: 'GOOGLE_NEARBY' as const,
      sourceQuery: 'hair_salon near Kensington NSW (seed)',
      hasWebsite: true,
      hasPhone: false,
      websiteUri: 'https://stylestudio.example.com',
      rating: 4.3,
      userRatingCount: 42,
      leadStatus: 'POTENTIAL_RESEARCH' as const,
      leadScore: 30,
      cleaningReasons: ['Has website but no phone — check contact page'],
      lastImportedAt: new Date(),
    },
  ];

  for (const lead of leads) {
    const created = await prisma.businessLead.upsert({
      where: { googlePlaceId: lead.googlePlaceId },
      update: {},
      create: lead,
    });

    await prisma.importEvent.create({
      data: {
        searchRunId: run.id,
        businessLeadId: created.id,
        googlePlaceId: lead.googlePlaceId,
        wasNew: true,
        finalStatus: lead.leadStatus,
        importReason: 'Seed data',
      },
    });
  }

  console.log(`✅ Seeded 1 SearchRun and ${leads.length} BusinessLeads`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => pool.end());

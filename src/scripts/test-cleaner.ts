import { cleanPlace } from '../lib/lead-cleaner';
import type { NormalizedPlace } from '../types/places';

function makePlace(overrides: Partial<NormalizedPlace> = {}): NormalizedPlace {
  return {
    placeId: `place_${Math.random().toString(36).slice(2)}`,
    name: 'Test Business',
    formattedAddress: '123 Test St, Kensington, NSW 2033, Australia',
    businessStatus: 'OPERATIONAL',
    ...overrides,
  };
}

const cases: Array<{ label: string; place: NormalizedPlace; expectStatus: string }> = [
  {
    label: '1. No website + phone -> TODO',
    place: makePlace({ name: "Bob's Barber", nationalPhoneNumber: '+61 2 1234 5678' }),
    expectStatus: 'TODO',
  },
  {
    label: '2. No website + no phone -> POTENTIAL_RESEARCH',
    place: makePlace({ name: 'Mystery Shop' }),
    expectStatus: 'POTENTIAL_RESEARCH',
  },
  {
    label: '3. Website + no phone -> POTENTIAL_RESEARCH',
    place: makePlace({ name: 'Site But No Phone', websiteUri: 'https://example.com' }),
    expectStatus: 'POTENTIAL_RESEARCH',
  },
  {
    label: '4. Website + phone -> DISCARDED',
    place: makePlace({ name: 'Full Setup', websiteUri: 'https://example.com', nationalPhoneNumber: '+61 2 9999 9999' }),
    expectStatus: 'DISCARDED',
  },
  {
    label: '5. Chain business -> DISCARDED',
    place: makePlace({ name: "McDonald's Kensington", nationalPhoneNumber: '+61 2 1234 5678' }),
    expectStatus: 'DISCARDED',
  },
  {
    label: '6. Non-operational -> DISCARDED',
    place: makePlace({ name: 'Closed Shop', businessStatus: 'CLOSED_PERMANENTLY' }),
    expectStatus: 'DISCARDED',
  },
  {
    label: '7. Lawyer + no website + phone -> TODO (HIGH gatekeeper)',
    place: makePlace({ name: 'Smith & Associates', primaryType: 'lawyer', nationalPhoneNumber: '+61 2 1234 5678' }),
    expectStatus: 'TODO',
  },
  {
    label: '8. Existing DEAD_END (simulated -- cleaner always assigns fresh status for new leads)',
    place: makePlace({ name: 'Old Lead' }),
    expectStatus: 'POTENTIAL_RESEARCH',
  },
  {
    label: '9. Existing SUCCEEDED (simulated -- importer never calls cleanPlace for existing records)',
    place: makePlace({ name: 'Won Deal', websiteUri: 'https://example.com', nationalPhoneNumber: '+61 2 9999 9999' }),
    expectStatus: 'DISCARDED',
  },
];

console.log('\n=== Lead Cleaner Tests ===\n');

let passed = 0;
for (const c of cases) {
  const result = cleanPlace(c.place);
  const ok = result.leadStatus === c.expectStatus;
  if (ok) passed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${c.label}`);
  console.log(`  status: ${result.leadStatus} | score: ${result.leadScore} | gkRisk: ${result.gatekeeperRisk} | chain: ${result.isChainLikely}`);
  console.log(`  reasons: ${result.cleaningReasons.join('; ')}`);
  if (!ok) console.log(`  EXPECTED: ${c.expectStatus} -- GOT: ${result.leadStatus}`);
  console.log();
}

console.log(`\nResults: ${passed}/${cases.length} passed`);
console.log('\nNote: Cases 8 & 9 simulate existing-record behavior.');
console.log('The importer (lead-importer.ts) never calls cleanPlace for existing records,');
console.log('so their leadStatus is never overwritten regardless of new search data.\n');

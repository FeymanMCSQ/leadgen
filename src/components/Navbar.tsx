'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/',          label: 'Search' },
  { href: '/leads',     label: 'Leads DB' },
  { href: '/dashboard', label: 'Dashboard' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="flex-shrink-0 h-12 bg-white border-b border-slate-200 flex items-center px-5 gap-4">
      <Image src="/icons/icon-48.png" alt="LeadGen" width={28} height={28} className="flex-shrink-0" />
      <span className="text-sm font-semibold text-slate-900 tracking-tight">LeadGen</span>
      <div className="w-px h-4 bg-slate-200" />
      <nav className="flex items-center gap-1">
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                active
                  ? 'bg-brand-green text-white'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface TopBarProps {
  branch?: 'TTDI' | 'Bukit Jelutong';
  onBranchChange?: (branch: 'TTDI' | 'Bukit Jelutong') => void;
}

export default function TopBar({ branch, onBranchChange }: TopBarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    // Exact match or starts with the href (but not just the parent path)
    if (pathname === href) return true;
    if (pathname.startsWith(href + '/')) return true;
    return false;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-4 sticky top-0 z-10">
      <div className="flex items-center justify-between p-3">
        {/* Navigation Links */}
        <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl">
          <Link
            href="/business-group/him-wellness/daily-sales"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive('/business-group/him-wellness/daily-sales')
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            Daily Sales
          </Link>
          <Link
            href="/business-group/him-wellness/daily-closing"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive('/business-group/him-wellness/daily-closing')
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            Daily Closing
          </Link>
          <Link
            href="/business-group/him-wellness/daily-registration"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive('/business-group/him-wellness/daily-registration')
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            Daily Registration
          </Link>
          <Link
            href="/business-group/him-wellness/occupancy-rate"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive('/business-group/him-wellness/occupancy-rate')
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            Occupancy Rate
          </Link>
        </div>

        {/* Branch Selector (if provided) */}
        {branch && onBranchChange && (
          <div className="flex gap-1 bg-slate-100/50 p-1 rounded-xl">
            <button
              onClick={() => onBranchChange('TTDI')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                branch === 'TTDI'
                  ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              TTDI
            </button>
            <button
              onClick={() => onBranchChange('Bukit Jelutong')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                branch === 'Bukit Jelutong'
                  ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Bukit Jelutong
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

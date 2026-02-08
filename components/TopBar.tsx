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
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg mb-4">
      <div className="flex items-center justify-between p-4">
        {/* Navigation Links */}
        <div className="flex items-center gap-2">
          <Link
            href="/business-group/him-wellness/daily-sales"
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              isActive('/business-group/him-wellness/daily-sales')
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            Daily Sales
          </Link>
          <Link
            href="/business-group/him-wellness/daily-closing"
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              isActive('/business-group/him-wellness/daily-closing')
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            Daily Closing
          </Link>
          <Link
            href="/business-group/him-wellness/daily-registration"
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              isActive('/business-group/him-wellness/daily-registration')
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            Daily Registration
          </Link>
          <Link
            href="/business-group/him-wellness/occupancy-rate"
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              isActive('/business-group/him-wellness/occupancy-rate')
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            Occupancy Rate
          </Link>
        </div>

        {/* Branch Selector (if provided) */}
        {branch && onBranchChange && (
          <div className="flex gap-2">
            <button
              onClick={() => onBranchChange('TTDI')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                branch === 'TTDI'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              TTDI
            </button>
            <button
              onClick={() => onBranchChange('Bukit Jelutong')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                branch === 'Bukit Jelutong'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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

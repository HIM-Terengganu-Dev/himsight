'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavItem {
  name: string;
  href: string;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  { name: 'Home', href: '/' },
  {
    name: 'Business Group',
    href: '#',
    children: [
      { name: 'HIM Wellness', href: '/business-group/him-wellness' },
      { name: 'HIM Product', href: '/business-group/him-product' },
      { name: 'HIM Clinic (Telehealth)', href: '/business-group/him-clinic' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>(['Business Group']);

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) =>
      prev.includes(groupName)
        ? prev.filter((name) => name !== groupName)
        : [...prev, groupName]
    );
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col w-64 h-full shrink-0">
      {/* Unified Floating Sidebar Container */}
      <div className="bg-white rounded-2xl shadow-lg flex-1 overflow-hidden flex flex-col">
        {/* Logo Section - Top of Sidebar */}
        <div className="flex items-center justify-center pt-8 pb-4 px-2 shrink-0 border-b border-gray-100">
          <Link href="/" className="flex items-center w-full justify-center">
            <div className="w-full h-32 flex items-center justify-center relative">
              <Image
                src="/himsight-side-Photoroom.png"
                alt="HIMSight Logo"
                fill
                className="object-contain scale-[1.5]"
                sizes="(max-width: 256px) 100vw, 256px"
                priority
              />
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6 custom-scrollbar">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleGroup(item.name)}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        openGroups.includes(item.name)
                          ? 'bg-blue-50 text-blue-700 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {/* Optional: Add icon here if needed */}
                        {item.name}
                      </span>
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${
                          openGroups.includes(item.name) ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        openGroups.includes(item.name) ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <ul className="space-y-1 pl-2">
                        {item.children.map((child) => (
                          <li key={child.name}>
                            <Link
                              href={child.href}
                              className={`block px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                                isActive(child.href)
                                  ? 'bg-blue-600 text-white shadow-md translate-x-1'
                                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1'
                              }`}
                            >
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`block px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive(item.href)
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Optional: User Profile or Bottom Section */}
        <div className="p-4 border-t border-gray-100">
           {/* Placeholder for user profile if needed later */}
        </div>
      </div>
    </div>
  );
}

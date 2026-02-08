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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
        {/* Logo Section - Top of Sidebar */}
        <div className="flex items-center justify-center pt-8 pb-6 px-4 shrink-0 border-b border-slate-100">
          <Link href="/" className="flex items-center w-full justify-center transition-transform hover:scale-105 duration-200">
            <div className="w-full h-24 flex items-center justify-center relative">
              <Image
                src="/himsight-side-Photoroom.png"
                alt="HIMSight Logo"
                fill
                className="object-contain scale-110"
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
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                        openGroups.includes(item.name)
                          ? 'bg-slate-50 text-slate-900'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {item.name}
                      </span>
                      <svg
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                          openGroups.includes(item.name) ? 'rotate-180 text-slate-600' : 'group-hover:text-slate-600'
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
                      <ul className="space-y-1 pl-3 border-l-2 border-slate-100 ml-3 my-1">
                        {item.children.map((child) => (
                          <li key={child.name}>
                            <Link
                              href={child.href}
                              className={`block px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                                isActive(child.href)
                                  ? 'text-blue-600 bg-blue-50 font-semibold translate-x-1'
                                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-1'
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
                    className={`block px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive(item.href)
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Footer Section */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
           <div className="text-xs text-slate-400 text-center font-medium">
             HIMSight v1.0
           </div>
        </div>
      </div>
    </div>
  );
}

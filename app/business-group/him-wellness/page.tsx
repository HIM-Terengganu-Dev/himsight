'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HIMWellness() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to daily-sales by default
    router.replace('/business-group/him-wellness/daily-sales');
  }, [router]);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

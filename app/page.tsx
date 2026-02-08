import DashboardLayout from '@/components/DashboardLayout';

export default function Home() {
  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Header / Title Area */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm mb-4">
          <h1 className="text-3xl font-bold text-slate-900">Welcome to HIMSight</h1>
          <p className="text-slate-600 mt-2">HIM Wellness Sdn. Bhd. Centralized Dashboard System</p>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white rounded-xl p-6 border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-center items-center">
          <div className="text-center max-w-lg">
            <div className="bg-blue-50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Dashboard in Development</h2>
            <p className="text-slate-600">
              Select a business group from the sidebar to view specific modules. 
              Currently configured for HIM Wellness, Product, and Clinic.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

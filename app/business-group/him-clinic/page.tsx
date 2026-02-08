import DashboardLayout from '@/components/DashboardLayout';

export default function HIMClinic() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">HIM Clinic (Telehealth)</h1>
          <p className="text-gray-600 mb-8">Dashboard for HIM Clinic Telehealth business group.</p>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">Dashboard content will be added here.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

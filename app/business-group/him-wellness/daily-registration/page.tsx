'use client';

import DashboardLayout from '@/components/DashboardLayout';
import TopBar from '@/components/TopBar';
import DateRangePicker from '@/components/DateRangePicker';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type Branch = 'TTDI' | 'Bukit Jelutong';

interface DailyRegistrationData {
  dateRange: {
    start: string;
    end: string;
  };
  totalRegistrations: number;
  totalNewPatients: number;
  totalExistingPatients: number;
  dailyRegistrations: {
    date: string;
    total: number;
    newPatients: number;
    existingPatients: number;
    registrations: {
      invoiceId: number;
      patientId: number;
      patientName: string;
      phoneNo: string;
      mrnNo: string | null;
      registrationDate: string;
      invoiceCode: string;
      receiptCode: string;
      doctorName: string;
      isNewPatient: boolean;
    }[];
  }[];
  chartData: {
    date: string;
    newPatients: number;
    existingPatients: number;
    total: number;
  }[];
}

export default function DailyRegistrationDashboard() {
  const [selectedBranch, setSelectedBranch] = useState<Branch>('TTDI');
  const [registrationData, setRegistrationData] = useState<DailyRegistrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [dateRangeInitialized, setDateRangeInitialized] = useState(false);

  // Fetch latest date from database and set default date range
  useEffect(() => {
    if (selectedBranch === 'TTDI' && !dateRangeInitialized) {
      fetchLatestDate();
    }
  }, [selectedBranch, dateRangeInitialized]);

  const fetchLatestDate = async () => {
    try {
      const response = await fetch('/api/wellness/latest-date');
      if (!response.ok) throw new Error('Failed to fetch latest date');
      const json = await response.json();
      
      if (json.latestDate) {
        const latestDate = new Date(json.latestDate);
        const startDate = new Date(latestDate);
        startDate.setDate(startDate.getDate() - 13); // 14 days including latest date
        
        setDateRange({
          start: startDate.toISOString().split('T')[0],
          end: latestDate.toISOString().split('T')[0],
        });
      } else {
        // Fallback to today if no data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 13);
        setDateRange({
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        });
      }
      setDateRangeInitialized(true);
    } catch (err) {
      console.error('Failed to fetch latest date:', err);
      // Fallback to today if error
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 13);
      setDateRange({
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      });
      setDateRangeInitialized(true);
    }
  };

  useEffect(() => {
    if (selectedBranch === 'TTDI' && dateRange) {
      fetchData();
    }
  }, [selectedBranch, dateRange]);

  const fetchData = async () => {
    if (!dateRange) return;
    
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
      });

      const response = await fetch(`/api/wellness/daily-registration?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch daily registration data');
      }
      const json = await response.json();
      setRegistrationData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (startDate: string, endDate: string) => {
    setDateRange({ start: startDate, end: endDate });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', { 
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col gap-4">
        {/* Top Bar Navigation */}
        <TopBar branch={selectedBranch} onBranchChange={setSelectedBranch} />

        {/* Dashboard Content - Only show if TTDI is selected */}
        {selectedBranch === 'TTDI' ? (
          <>
            {/* Date Range Picker */}
            {dateRange && (
              <DateRangePicker
                startDate={dateRange.start}
                endDate={dateRange.end}
                onDateChange={handleDateChange}
              />
            )}

            {loading ? (
            <div className="flex-1 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Data</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button 
                  onClick={fetchData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : registrationData ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
              {/* Date Range Banner */}
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
                <p className="text-sm text-blue-800 font-semibold">
                  📅 Date Range: <span className="font-bold">{formatDate(registrationData.dateRange.start)}</span> to <span className="font-bold">{formatDate(registrationData.dateRange.end)}</span>
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Registrations */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Registrations</h3>
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-gray-900 mb-2">{registrationData.totalRegistrations}</p>
                  <p className="text-sm text-gray-500">booking fee payments</p>
                </div>

                {/* New Patients */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">New Patients</h3>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-gray-900 mb-2">{registrationData.totalNewPatients}</p>
                  <p className="text-sm text-gray-500">first-time registrations</p>
                </div>

                {/* Existing Patients */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Existing Patients</h3>
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-gray-900 mb-2">{registrationData.totalExistingPatients}</p>
                  <p className="text-sm text-gray-500">returning patients</p>
                </div>
              </div>

              {/* Line Chart - Registration Trend */}
              {registrationData.chartData && registrationData.chartData.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Registration Trend (Last 30 Days)</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={registrationData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        labelFormatter={(label) => formatDate(label)}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="newPatients" 
                        name="New Patients"
                        stroke="#2563eb" 
                        strokeWidth={3}
                        dot={{ fill: '#2563eb', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="existingPatients" 
                        name="Existing Patients"
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={{ fill: '#10b981', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        name="Total Registrations"
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: '#f59e0b', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Daily Registrations by Date */}
              {registrationData.dailyRegistrations.length > 0 ? (
                <div className="space-y-4">
                  {registrationData.dailyRegistrations.map((day) => (
                    <div key={day.date} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">{formatDate(day.date)}</h3>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600">
                            <span className="font-semibold text-blue-600">{day.newPatients}</span> new,{' '}
                            <span className="font-semibold text-green-600">{day.existingPatients}</span> existing
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            Total: {day.total}
                          </span>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MRN</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Code</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {day.registrations.map((registration) => (
                              <tr key={registration.invoiceId} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{registration.patientName}</div>
                                  <div className="text-sm text-gray-500">{registration.phoneNo}</div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">{registration.mrnNo || 'N/A'}</span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  {registration.isNewPatient ? (
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                      New
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                      Existing
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {registration.doctorName}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {registration.invoiceCode}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-12 shadow-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Registrations Found</h3>
                    <p className="text-gray-600">No booking fee payments found in the last 30 days.</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
          </>
        ) : (
          /* Bukit Jelutong - Coming Soon */
          <div className="flex-1 bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Bukit Jelutong Branch</h3>
              <p className="text-gray-600">Dashboard coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

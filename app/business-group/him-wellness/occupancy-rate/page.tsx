'use client';

import DashboardLayout from '@/components/DashboardLayout';
import TopBar from '@/components/TopBar';
import DateRangePicker from '@/components/DateRangePicker';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, ReferenceLine } from 'recharts';

type Branch = 'TTDI' | 'Bukit Jelutong';

interface OccupancyRateData {
  dateRange: {
    start: string;
    end: string;
  };
  dailyOccupancy: {
    date: string;
    consultationCount: number;
    procedureCount: number;
    consultationOccupancyRate: number;
    treatmentOccupancyRate: number;
  }[];
  consultationChartData: {
    date: string;
    consultationOccupancy: number;
    consultationCount: number;
  }[];
  procedureChartData: {
    date: string;
    [procedureCode: string]: string | number;
  }[];
  procedureCodeNames: {
    code: string;
    name: string;
  }[];
  summary: {
    avgConsultationOccupancy: number;
    avgTreatmentOccupancy: number;
  };
}

export default function OccupancyRateDashboard() {
  const [selectedBranch, setSelectedBranch] = useState<Branch>('TTDI');
  const [occupancyData, setOccupancyData] = useState<OccupancyRateData | null>(null);
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
        startDate.setDate(startDate.getDate() - 29); // 30 days including latest date
        
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

      const response = await fetch(`/api/wellness/occupancy-rate?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch occupancy rate data');
      }
      const json = await response.json();
      setOccupancyData(json);
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
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600 font-medium">Loading data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Error Loading Data</h3>
                <p className="text-slate-600 mb-4">{error}</p>
                <button 
                  onClick={fetchData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : occupancyData ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
              {/* Date Range Banner */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-600 font-medium flex items-center gap-2">
                  <span className="text-slate-400">📅</span>
                  Date Range: <span className="font-bold text-slate-900">{formatDate(occupancyData.dateRange.start)}</span> to <span className="font-bold text-slate-900">{formatDate(occupancyData.dateRange.end)}</span>
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Average Consultation Occupancy */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Avg Consultation</h3>
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-2">{occupancyData.summary.avgConsultationOccupancy.toFixed(1)}%</p>
                  <p className="text-xs text-slate-400 font-medium">of 16 slots/day</p>
                </div>

                {/* Average Treatment Occupancy */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Avg Treatment</h3>
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-2">{occupancyData.summary.avgTreatmentOccupancy.toFixed(1)}%</p>
                  <p className="text-xs text-slate-400 font-medium">of 32 slots/day</p>
                </div>

                {/* Total Consultation Slots Used */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Consultations</h3>
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-2">
                    {occupancyData.dailyOccupancy.reduce((sum, day) => sum + day.consultationCount, 0)}
                  </p>
                  <p className="text-xs text-slate-400 font-medium">slots used (period)</p>
                </div>

                {/* Total Treatment Slots Used */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Treatments</h3>
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-2">
                    {occupancyData.dailyOccupancy.reduce((sum, day) => sum + day.procedureCount, 0)}
                  </p>
                  <p className="text-xs text-slate-400 font-medium">slots used (period)</p>
                </div>
              </div>

              {/* Consultation Bar Chart */}
              {occupancyData.consultationChartData && occupancyData.consultationChartData.length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Consultation Occupancy Rate</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={occupancyData.consultationChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                        label={{ value: 'Occupancy Rate (%)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                      />
                      <Tooltip 
                        labelFormatter={(label) => formatDate(label)}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Consultation Occupancy']}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          color: '#1e293b'
                        }}
                      />
                      <Legend 
                        iconType="circle"
                        wrapperStyle={{ paddingTop: '20px' }}
                      />
                      <ReferenceLine 
                        y={100} 
                        stroke="#ef4444" 
                        strokeDasharray="5 5" 
                        strokeWidth={2}
                        label={{ value: "100%", position: "right", fill: "#ef4444" }}
                      />
                      <Bar 
                        dataKey="consultationOccupancy" 
                        name="Consultation Occupancy"
                        fill="#2563eb"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Procedure Stacked Bar Chart */}
              {occupancyData.procedureChartData && occupancyData.procedureChartData.length > 0 && occupancyData.procedureCodeNames.length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Treatment Occupancy by Procedure Code</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={occupancyData.procedureChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                        allowDecimals={false}
                        domain={[0, 32]}
                        label={{ value: 'Number of Treatments', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                      />
                      <Tooltip 
                        labelFormatter={(label) => formatDate(label)}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          color: '#1e293b'
                        }}
                      />
                      <Legend 
                        iconType="circle"
                        wrapperStyle={{ paddingTop: '20px' }}
                      />
                      <ReferenceLine 
                        y={32} 
                        stroke="#ef4444" 
                        strokeDasharray="5 5" 
                        strokeWidth={2}
                        label={{ value: "32 (100%)", position: "right", fill: "#ef4444" }}
                      />
                      {occupancyData.procedureCodeNames.map((proc, index) => {
                        // Generate colors for each procedure code
                        const colors = [
                          '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                          '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
                          '#14b8a6', '#a855f7', '#f43f5e', '#0ea5e9', '#22c55e'
                        ];
                        const color = colors[index % colors.length];
                        return (
                          <Bar 
                            key={proc.code}
                            dataKey={proc.code} 
                            stackId="procedures"
                            name={proc.name || proc.code}
                            fill={color}
                          />
                        );
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Daily Breakdown Table */}
              {occupancyData.dailyOccupancy.length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Daily Occupancy Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-l-lg">Date</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Consultations</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Consultation Rate</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Treatments</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-r-lg">Treatment Rate</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {occupancyData.dailyOccupancy.map((day) => (
                          <tr key={day.date} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                              {formatDate(day.date)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-slate-600">
                              {day.consultationCount} / 16
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-semibold text-slate-900">
                              {day.consultationOccupancyRate.toFixed(1)}%
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-slate-600">
                              {day.procedureCount} / 32
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-semibold text-slate-900">
                              {day.treatmentOccupancyRate.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
          </>
        ) : (
          /* Bukit Jelutong - Coming Soon */
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Bukit Jelutong Branch</h3>
              <p className="text-slate-500">Dashboard coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

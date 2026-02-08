'use client';

import DashboardLayout from '@/components/DashboardLayout';
import TopBar from '@/components/TopBar';
import DateRangePicker from '@/components/DateRangePicker';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type Branch = 'TTDI' | 'Bukit Jelutong';

interface DailyClosingData {
  dateRange: {
    start: string;
    end: string;
  };
  totalClosings: number;
  dailyClosings: {
    date: string;
    count: number;
    closings: {
      invoiceId: number;
      patientId: number;
      patientName: string;
      phoneNo: string;
      closingDate: string;
      invoiceCode: string;
      receiptCode: string;
      procedureName: string;
      procedureCode: string;
      doctorName: string;
      isNewPatient: boolean;
    }[];
  }[];
  procedureBreakdown: {
    procedureName: string;
    procedureCode: string;
    count: number;
  }[];
  chartData: {
    date: string;
    [procedureCode: string]: string | number;
  }[];
}

export default function DailyClosingDashboard() {
  const [selectedBranch, setSelectedBranch] = useState<Branch>('TTDI');
  const [closingData, setClosingData] = useState<DailyClosingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [dateRangeInitialized, setDateRangeInitialized] = useState(false);

  // Check sessionStorage first, then fetch default date range
  useEffect(() => {
    if (selectedBranch === 'TTDI' && !dateRangeInitialized) {
      // Check sessionStorage for saved date range
      const savedDateRange = sessionStorage.getItem('him-wellness-date-range');
      if (savedDateRange) {
        try {
          const parsed = JSON.parse(savedDateRange);
          if (parsed.start && parsed.end) {
            setDateRange({ start: parsed.start, end: parsed.end });
            setDateRangeInitialized(true);
            return;
          }
        } catch (e) {
          console.error('Failed to parse saved date range:', e);
        }
      }
      // No saved date range, fetch default
      fetchLatestDate();
    }
  }, [selectedBranch, dateRangeInitialized]);

  const fetchLatestDate = async () => {
    try {
      const response = await fetch('/api/wellness/latest-date');
      if (!response.ok) throw new Error('Failed to fetch latest date');
      const json = await response.json();
      
      if (json.latestDate) {
        // Parse date string directly without timezone conversion
        // json.latestDate is already in YYYY-MM-DD format
        const [year, month, day] = json.latestDate.split('-').map(Number);
        const latestDate = new Date(year, month - 1, day); // month is 0-indexed
        const startDate = new Date(latestDate);
        startDate.setDate(startDate.getDate() - 29); // 30 days including latest date
        
        // Format as YYYY-MM-DD without timezone conversion
        const formatDate = (date: Date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        };
        
        const defaultRange = {
          start: formatDate(startDate),
          end: formatDate(latestDate),
        };
        setDateRange(defaultRange);
      } else {
        // Fallback to today if no data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 13);
        const defaultRange = {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        };
        setDateRange(defaultRange);
      }
      setDateRangeInitialized(true);
    } catch (err) {
      console.error('Failed to fetch latest date:', err);
      // Fallback to today if error
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 13);
      const defaultRange = {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      };
      setDateRange(defaultRange);
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

      const response = await fetch(`/api/wellness/daily-closing?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch daily closing data');
      }
      const json = await response.json();
      setClosingData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (startDate: string, endDate: string) => {
    const newRange = { start: startDate, end: endDate };
    setDateRange(newRange);
    // Save to sessionStorage so it persists across pages
    sessionStorage.setItem('him-wellness-date-range', JSON.stringify(newRange));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', { 
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return 'N/A';
    return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
          ) : closingData ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
              {/* Date Range Banner */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-600 font-medium flex items-center gap-2">
                  <span className="text-slate-400">📅</span>
                  Date Range: <span className="font-bold text-slate-900">{formatDate(closingData.dateRange.start)}</span> to <span className="font-bold text-slate-900">{formatDate(closingData.dateRange.end)}</span>
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total Closings */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Closings</h3>
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-2">{closingData.totalClosings}</p>
                  <p className="text-xs text-slate-400 font-medium">procedure subscriptions closed</p>
                </div>

                {/* Unique Procedures */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Unique Procedures</h3>
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-2">{closingData.procedureBreakdown.length}</p>
                  <p className="text-xs text-slate-400 font-medium">different procedure types</p>
                </div>
              </div>

              {/* Line Chart - Procedure Closings Trend */}
              {closingData.chartData && closingData.chartData.length > 0 && (
                <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-sm overflow-x-auto">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 sm:mb-6">Procedure Closings Trend</h3>
                  <div className="w-full min-w-[600px] sm:min-w-0">
                    <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={closingData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                        stroke="#94a3b8"
                        style={{ fontSize: '10px' }}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        interval="preserveStartEnd"
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis 
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                        allowDecimals={false}
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
                      {closingData.procedureBreakdown.map((proc, index) => {
                        // Generate colors for each procedure code
                        const colors = [
                          '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                          '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'
                        ];
                        const color = colors[index % colors.length];
                        return (
                          <Line 
                            key={proc.procedureCode}
                            type="monotone" 
                            dataKey={proc.procedureCode} 
                            name={proc.procedureName || proc.procedureCode}
                            stroke={color}
                            strokeWidth={2.5}
                            dot={{ fill: color, r: 3, strokeWidth: 0 }}
                            activeDot={{ r: 6, strokeWidth: 4, stroke: `${color}80` }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Daily Closings by Date */}
              {closingData.dailyClosings.length > 0 ? (
                <div className="space-y-4">
                  {closingData.dailyClosings.map((day) => (
                    <div key={day.date} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900">{formatDate(day.date)}</h3>
                        <span className="text-sm text-slate-500 font-medium">
                          <span className="font-bold text-slate-900">{day.count}</span> closing{day.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-l-lg">Patient</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Procedure</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Doctor</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-r-lg">Invoice Code</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100">
                            {day.closings.map((closing) => (
                              <tr key={closing.invoiceId} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-slate-900">{closing.patientName}</div>
                                  <div className="text-xs text-slate-500">{closing.phoneNo}</div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="text-sm text-slate-700">{closing.procedureName}</div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                    {closing.procedureCode}
                                  </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                                  {closing.doctorName}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                                  {closing.invoiceCode}
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
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">No Closings Found</h3>
                    <p className="text-slate-500">No new patient subscriptions found in this period.</p>
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

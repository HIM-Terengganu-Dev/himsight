'use client';

import DashboardLayout from '@/components/DashboardLayout';
import TopBar from '@/components/TopBar';
import DateRangePicker from '@/components/DateRangePicker';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Branch = 'TTDI' | 'Bukit Jelutong';

interface DailySalesData {
  latestDate: string;
  totalVisits: number;
  totalSales: number;
  avgTransaction: number;
  pendingCount: number;
  pendingTotal: number;
  trend: number;
}

interface TrendData {
  date: string;
  totalSales: number;
  visitCount: number;
}

export default function DailySalesDashboard() {
  const [selectedBranch, setSelectedBranch] = useState<Branch>('TTDI');
  const [dailyData, setDailyData] = useState<DailySalesData | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
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

      // Fetch daily sales data
      const dailyResponse = await fetch('/api/wellness/daily-sales');
      if (!dailyResponse.ok) throw new Error('Failed to fetch daily sales');
      const dailyJson = await dailyResponse.json();
      setDailyData(dailyJson);

      // Fetch trend data
      const trendResponse = await fetch(`/api/wellness/sales-trend?${params}`);
      if (!trendResponse.ok) throw new Error('Failed to fetch sales trend');
      const trendJson = await trendResponse.json();
      setTrendData(trendJson);
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
    // Parse date string directly without timezone conversion
    // dateString is in YYYY-MM-DD format
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-MY', { 
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
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
          ) : dailyData ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
              {/* Date Banner */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-600 font-medium flex items-center gap-2">
                  <span className="text-slate-400">📅</span>
                  Latest Data: <span className="font-bold text-slate-900">{formatDate(dailyData.latestDate)}</span>
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Total Sales */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Sales</h3>
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-2">{formatCurrency(dailyData.totalSales)}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      dailyData.trend >= 0 
                        ? 'text-green-700 bg-green-50 border border-green-100' 
                        : 'text-red-700 bg-red-50 border border-red-100'
                    }`}>
                      {dailyData.trend >= 0 ? '+' : ''}{dailyData.trend}%
                    </span>
                    <span className="text-xs text-slate-400 font-medium">vs previous day</span>
                  </div>
                </div>

                {/* Total Visits */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Visits</h3>
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-2">{dailyData.totalVisits}</p>
                  <p className="text-xs text-slate-400 font-medium">patient visits</p>
                </div>

                {/* Average Transaction */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Avg Transaction</h3>
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-2">{formatCurrency(dailyData.avgTransaction)}</p>
                  <p className="text-xs text-slate-400 font-medium">per visit</p>
                </div>
              </div>

              {/* Sales Trend Chart */}
              {trendData.length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Sales Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => {
                          // Handle date string format YYYY-MM-DD
                          if (typeof date === 'string') {
                            const [year, month, day] = date.split('-');
                            const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                            return dateObj.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
                          }
                          return new Date(date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
                        }}
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `RM ${(value / 1000).toFixed(0)}k`}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Sales']}
                        labelFormatter={(label) => formatDate(label)}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          color: '#1e293b'
                        }}
                        itemStyle={{ color: '#2563eb' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="totalSales" 
                        stroke="#2563eb" 
                        strokeWidth={2.5}
                        dot={{ fill: '#2563eb', r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 6, stroke: '#bfdbfe', strokeWidth: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
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

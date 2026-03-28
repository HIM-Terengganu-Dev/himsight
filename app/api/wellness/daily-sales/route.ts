import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let startDate = searchParams.get('startDate');
    let endDate = searchParams.get('endDate');

    console.log(`Fetching daily sales data for range ${startDate} to ${endDate}...`);
    console.log('Connection string available:', !!process.env.HIM_WELLNESS_TTDI_DB);
    
    // Verify connection is available
    if (!process.env.HIM_WELLNESS_TTDI_DB) {
      throw new Error('Database connection string not configured');
    }

    // Test connection first
    await pool.query('SELECT 1');
    console.log('Database connection verified');
    
    // If no dates provided, fallback to the last 30 days based on latest invoice
    if (!startDate || !endDate) {
      console.log('No dates provided, calculating defaults...');
      const latestDateQuery = `
        SELECT MAX(invoice_date::date) as latest_date
        FROM him_ttdi.invoices;
      `;
      const latestDateResult = await pool.query(latestDateQuery);
      const latestDbDate = latestDateResult.rows[0]?.latest_date;
      
      if (latestDbDate) {
        const defaultStart = new Date(latestDbDate);
        defaultStart.setDate(defaultStart.getDate() - 29); // 30 days including latest
        endDate = latestDbDate.toISOString().split('T')[0];
        startDate = defaultStart.toISOString().split('T')[0];
      } else {
        const today = new Date();
        const defaultStart = new Date();
        defaultStart.setDate(defaultStart.getDate() - 29);
        endDate = today.toISOString().split('T')[0];
        startDate = defaultStart.toISOString().split('T')[0];
      }
    }

    // Now query data strictly inside the selected date range
    // Using startDate and endDate
    console.log('Date range:', { startDate, endDate });
    const query = `
      SELECT 
        COUNT(*) as total_visits,
        COALESCE(SUM(invoice_total), 0) as total_sales,
        COALESCE(AVG(invoice_total), 0) as avg_transaction,
        MAX(TO_CHAR(invoice_date, 'YYYY-MM-DD')) as data_latest_date
      FROM him_ttdi.invoices
      WHERE TO_CHAR(invoice_date, 'YYYY-MM-DD') >= $1
      AND TO_CHAR(invoice_date, 'YYYY-MM-DD') <= $2;
    `;

    console.log('Executing main query for date range:', startDate, 'to', endDate);
    const result = await pool.query(query, [startDate, endDate]);
    
    if (!result.rows || result.rows.length === 0) {
      console.log('No data found for the given date range');
      return NextResponse.json({
        latestDate: endDate,
        totalVisits: 0,
        totalSales: 0,
        avgTransaction: 0,
        pendingCount: 0,
        pendingTotal: 0,
        trend: 0,
      });
    }

    const data = result.rows[0];
    console.log('Main query result:', data);

    // Get pending payments for the latest date
    const pendingQuery = `
      SELECT 
        COUNT(*) as pending_count,
        COALESCE(SUM(total_amount), 0) as pending_total
      FROM him_ttdi.itemized_sales
      WHERE visit_date >= $1::date
      AND visit_date <= $2::date
      AND payment_status = 'pending';
    `;

    console.log('Executing pending payments query...');
    const pendingResult = await pool.query(pendingQuery, [startDate, endDate]);
    const pendingData = pendingResult.rows[0] || { pending_count: 0, pending_total: 0 };
    console.log('Pending payments result:', pendingData);

    // Get previous period sales for trend comparison
    // Calculate the number of days in the current period
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Calculate previous period dates
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - diffDays + 1);

    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const prevStartStr = formatDate(prevStart);
    const prevEndStr = formatDate(prevEnd);

    console.log(`Calculating trend for previous period: ${prevStartStr} to ${prevEndStr} (${diffDays} days)`);

    const previousPeriodQuery = `
      SELECT 
        COALESCE(SUM(invoice_total), 0) as previous_sales
      FROM him_ttdi.invoices
      WHERE TO_CHAR(invoice_date, 'YYYY-MM-DD') >= $1
      AND TO_CHAR(invoice_date, 'YYYY-MM-DD') <= $2;
    `;

    console.log('Executing previous period sales query...');
    const previousResult = await pool.query(previousPeriodQuery, [prevStartStr, prevEndStr]);
    const previousData = previousResult.rows[0] || { previous_sales: 0 };
    console.log('Previous period sales result:', previousData);

    // Calculate trend percentage
    const previousSales = parseFloat(previousData.previous_sales) || 0;
    const currentSales = parseFloat(data.total_sales) || 0;
    const trend = previousSales > 0 
      ? ((currentSales - previousSales) / previousSales * 100).toFixed(1)
      : 0;

    const actualLatestDateInData = data.data_latest_date || endDate; // Fallback to endDate if no data in range

    const response = {
      latestDate: actualLatestDateInData,
      startDate: startDate,
      endDate: endDate,
      totalVisits: parseInt(data.total_visits) || 0,
      totalSales: parseFloat(data.total_sales) || 0,
      avgTransaction: parseFloat(data.avg_transaction) || 0,
      pendingCount: parseInt(pendingData.pending_count) || 0,
      pendingTotal: parseFloat(pendingData.pending_total) || 0,
      trend: parseFloat(trend.toString()),
    };

    console.log('Sending response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Database error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorCode = (error as any)?.code;
    const errorDetail = (error as any)?.detail;
    
    console.error('Error details:', {
      message: errorMessage,
      code: errorCode,
      detail: errorDetail,
      stack: errorStack,
    });
    
    // Return detailed error in development, generic in production
    return NextResponse.json(
      { 
        error: 'Failed to fetch daily sales data',
        message: errorMessage,
        code: errorCode,
        detail: errorDetail,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack }),
      },
      { status: 500 }
    );
  }
}

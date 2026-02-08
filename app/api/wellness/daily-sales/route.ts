import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    console.log('Fetching daily sales data...');
    console.log('Connection string available:', !!process.env.HIM_WELLNESS_TTDI_DB);
    
    // Verify connection is available
    if (!process.env.HIM_WELLNESS_TTDI_DB) {
      throw new Error('Database connection string not configured');
    }

    // Test connection first
    await pool.query('SELECT 1');
    console.log('Database connection verified');
    
    // Get the latest date first
    // Use TO_CHAR to return date as string directly, avoiding timezone conversion issues
    const latestDateQuery = `
      SELECT MAX(TO_CHAR(invoice_date, 'YYYY-MM-DD')) as latest_date
      FROM him_ttdi.invoices;
    `;
    
    console.log('Getting latest date...');
    const latestDateResult = await pool.query(latestDateQuery);
    const latestDate = latestDateResult.rows[0]?.latest_date;
    
    if (!latestDate) {
      console.log('No invoices found in database');
      return NextResponse.json({
        latestDate: new Date().toISOString().split('T')[0],
        totalVisits: 0,
        totalSales: 0,
        avgTransaction: 0,
        pendingCount: 0,
        pendingTotal: 0,
        trend: 0,
      });
    }

    console.log('Latest date:', latestDate);

    // Get data for the latest date
    const query = `
      SELECT 
        COUNT(*) as total_visits,
        COALESCE(SUM(invoice_total), 0) as total_sales,
        COALESCE(AVG(invoice_total), 0) as avg_transaction
      FROM him_ttdi.invoices
      WHERE invoice_date::date = $1::date;
    `;

    console.log('Executing main query for date:', latestDate);
    const result = await pool.query(query, [latestDate]);
    
    if (!result.rows || result.rows.length === 0) {
      console.log('No data found for latest date');
      return NextResponse.json({
        latestDate: latestDate,
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
      WHERE visit_date = (
        SELECT MAX(visit_date) FROM him_ttdi.itemized_sales
      )
      AND payment_status = 'pending';
    `;

    console.log('Executing pending payments query...');
    const pendingResult = await pool.query(pendingQuery);
    const pendingData = pendingResult.rows[0] || { pending_count: 0, pending_total: 0 };
    console.log('Pending payments result:', pendingData);

    // Get yesterday's sales for comparison
    // latestDate is already a string in YYYY-MM-DD format from TO_CHAR
    // Calculate yesterday by parsing the date string directly
    const [year, month, day] = latestDate.split('-').map(Number);
    const latestDateObj = new Date(year, month - 1, day);
    const yesterdayDateObj = new Date(latestDateObj);
    yesterdayDateObj.setDate(yesterdayDateObj.getDate() - 1);
    
    // Format as YYYY-MM-DD without timezone conversion
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    const yesterdayDateStr = formatDate(yesterdayDateObj);
    
    console.log('Latest date:', latestDate, 'Yesterday date:', yesterdayDateStr);

    const yesterdayQuery = `
      SELECT 
        COALESCE(SUM(invoice_total), 0) as yesterday_sales
      FROM him_ttdi.invoices
      WHERE invoice_date::date = $1::date;
    `;

    console.log('Executing yesterday sales query for date:', yesterdayDateStr);
    const yesterdayResult = await pool.query(yesterdayQuery, [yesterdayDateStr]);
    const yesterdayData = yesterdayResult.rows[0] || { yesterday_sales: 0 };
    console.log('Yesterday sales result:', yesterdayData);

    // Calculate trend percentage
    const yesterdaySales = parseFloat(yesterdayData.yesterday_sales) || 0;
    const todaySales = parseFloat(data.total_sales) || 0;
    const trend = yesterdaySales > 0 
      ? ((todaySales - yesterdaySales) / yesterdaySales * 100).toFixed(1)
      : 0;

    const response = {
      latestDate: latestDate,
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

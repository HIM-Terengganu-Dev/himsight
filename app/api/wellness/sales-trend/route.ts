import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get date range from query parameters, default to last 14 days
    const { searchParams } = new URL(request.url);
    let startDate = searchParams.get('startDate');
    let endDate = searchParams.get('endDate');

    // If no dates provided, default to last 14 days
    if (!startDate || !endDate) {
      const latestDateQuery = `
        SELECT MAX(invoice_date::date) as latest_date
        FROM him_ttdi.invoices;
      `;
      const latestDateResult = await pool.query(latestDateQuery);
      const latestDate = latestDateResult.rows[0]?.latest_date;
      
      if (latestDate) {
        const defaultStart = new Date(latestDate);
        defaultStart.setDate(defaultStart.getDate() - 29); // 30 days including today
        endDate = latestDate.toISOString().split('T')[0];
        startDate = defaultStart.toISOString().split('T')[0];
      } else {
        // Fallback if no data
        const today = new Date();
        const defaultStart = new Date();
        defaultStart.setDate(defaultStart.getDate() - 29);
        endDate = today.toISOString().split('T')[0];
        startDate = defaultStart.toISOString().split('T')[0];
      }
    }

    console.log(`Fetching sales trend data from ${startDate} to ${endDate}`);
    
    // Verify connection
    if (!process.env.HIM_WELLNESS_TTDI_DB) {
      throw new Error('Database connection string not configured');
    }

    const query = `
      SELECT 
        TO_CHAR(invoice_date, 'YYYY-MM-DD') as date,
        COALESCE(SUM(invoice_total), 0) as total_sales,
        COUNT(*) as visit_count
      FROM him_ttdi.invoices
      WHERE TO_CHAR(invoice_date, 'YYYY-MM-DD') >= $1
      AND TO_CHAR(invoice_date, 'YYYY-MM-DD') <= $2
      GROUP BY TO_CHAR(invoice_date, 'YYYY-MM-DD')
      ORDER BY date ASC;
    `;

    const result = await pool.query(query, [startDate, endDate]);
    console.log(`Found ${result.rows.length} days of data`);

    const data = result.rows.map(row => {
      // date is already a string in YYYY-MM-DD format from TO_CHAR
      return {
        date: row.date,
        totalSales: parseFloat(row.total_sales) || 0,
        visitCount: parseInt(row.visit_count) || 0,
      };
    });

    return NextResponse.json(data);
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
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch sales trend data',
        message: errorMessage,
        code: errorCode,
        detail: errorDetail,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack }),
      },
      { status: 500 }
    );
  }
}

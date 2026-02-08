import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Verify connection
    if (!process.env.HIM_WELLNESS_TTDI_DB) {
      throw new Error('Database connection string not configured');
    }

    // Get the latest date from all relevant tables
    // Use TO_CHAR to return date as string directly, avoiding timezone conversion issues
    // Note: invoice_date is timestamp without time zone stored in Malaysia time
    // We use TO_CHAR directly on invoice_date to get the date string without timezone conversion
    // For invoice_date, we need to handle it as Malaysia time (UTC+8)
    const latestDateQuery = `
      SELECT 
        GREATEST(
          COALESCE(
            (SELECT MAX(TO_CHAR(invoice_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kuala_Lumpur', 'YYYY-MM-DD')) FROM him_ttdi.invoices),
            '1970-01-01'
          ),
          COALESCE(
            (SELECT MAX(TO_CHAR(visit_date, 'YYYY-MM-DD')) FROM him_ttdi.consultations),
            '1970-01-01'
          ),
          COALESCE(
            (SELECT MAX(TO_CHAR(prescription_date, 'YYYY-MM-DD')) FROM him_ttdi.procedure_prescriptions),
            '1970-01-01'
          )
        ) as latest_date;
    `;
    
    const result = await pool.query(latestDateQuery);
    const latestDate = result.rows[0]?.latest_date;
    
    if (!latestDate) {
      return NextResponse.json({
        latestDate: null,
      });
    }

    // latestDate is already a string in YYYY-MM-DD format from TO_CHAR
    // Log for debugging
    console.log('API: /api/wellness/latest-date - Latest date from DB:', latestDate);
    
    return NextResponse.json({
      latestDate: latestDate,
    });
  } catch (error) {
    console.error('API: /api/wellness/latest-date - Database error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        error: 'Failed to fetch latest date',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

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
    // We need to add 8 hours before casting to date to get the correct Malaysia date
    const latestDateQuery = `
      SELECT 
        TO_CHAR(
          GREATEST(
            COALESCE(MAX(DATE(invoice_date + INTERVAL '8 hours')), '1970-01-01'::date),
            COALESCE(MAX(visit_date), '1970-01-01'::date),
            COALESCE(MAX(DATE(prescription_date)), '1970-01-01'::date)
          ),
          'YYYY-MM-DD'
        ) as latest_date
      FROM (
        SELECT DATE(invoice_date + INTERVAL '8 hours') as invoice_date, NULL::date as visit_date, NULL::date as prescription_date FROM him_ttdi.invoices
        UNION ALL
        SELECT NULL::date, visit_date, NULL::date FROM him_ttdi.consultations
        UNION ALL
        SELECT NULL::date, NULL::date, DATE(prescription_date) FROM him_ttdi.procedure_prescriptions
      ) combined_dates;
    `;
    
    const result = await pool.query(latestDateQuery);
    const latestDate = result.rows[0]?.latest_date;
    
    if (!latestDate) {
      return NextResponse.json({
        latestDate: null,
      });
    }

    // latestDate is already a string in YYYY-MM-DD format from TO_CHAR
    const latestDateStr = latestDate;

    return NextResponse.json({
      latestDate: latestDateStr,
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

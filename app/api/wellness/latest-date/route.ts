import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Verify connection
    if (!process.env.HIM_WELLNESS_TTDI_DB) {
      throw new Error('Database connection string not configured');
    }

    // Get the latest date from all relevant tables
    const latestDateQuery = `
      SELECT 
        GREATEST(
          COALESCE(MAX(invoice_date::date), '1970-01-01'::date),
          COALESCE(MAX(visit_date), '1970-01-01'::date),
          COALESCE(MAX((prescription_date::text::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')::date), '1970-01-01'::date)
        ) as latest_date
      FROM (
        SELECT invoice_date::date, NULL::date as visit_date, NULL::date as prescription_date FROM him_ttdi.invoices
        UNION ALL
        SELECT NULL::date, visit_date, NULL::date FROM him_ttdi.consultations
        UNION ALL
        SELECT NULL::date, NULL::date, (prescription_date::text::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')::date FROM him_ttdi.procedure_prescriptions
      ) combined_dates;
    `;
    
    const result = await pool.query(latestDateQuery);
    const latestDate = result.rows[0]?.latest_date;
    
    if (!latestDate) {
      return NextResponse.json({
        latestDate: null,
      });
    }

    // Return as string in YYYY-MM-DD format
    const latestDateStr = typeof latestDate === 'string' 
      ? latestDate 
      : latestDate.toISOString().split('T')[0];

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

import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Test basic connection
    const testResult = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    
    // Test schema access
    const schemaResult = await pool.query(`
      SELECT COUNT(*) as table_count
      FROM information_schema.tables 
      WHERE table_schema = 'him_ttdi'
    `);

    // Test invoices table exists
    const invoiceTest = await pool.query(`
      SELECT 
        COUNT(*) as total_count,
        MAX(invoice_date) as latest_invoice_date
      FROM him_ttdi.invoices
    `);

    return NextResponse.json({
      success: true,
      connection: {
        currentTime: testResult.rows[0].current_time,
        database: testResult.rows[0].db_name,
      },
      schema: {
        tableCount: parseInt(schemaResult.rows[0].table_count),
      },
      invoices: {
        totalCount: parseInt(invoiceTest.rows[0].total_count),
        latestInvoiceDate: invoiceTest.rows[0].latest_invoice_date,
      },
    });
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        envVarExists: !!process.env.HIM_WELLNESS_TTDI_DB,
      },
      { status: 500 }
    );
  }
}

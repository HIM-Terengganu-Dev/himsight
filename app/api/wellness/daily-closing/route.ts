import { NextResponse } from 'next/server';
import pool from '@/lib/db';

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
        FROM him_ttdi.invoices
        WHERE invoice_total > 0;
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

    console.log(`Fetching daily closing data from ${startDate} to ${endDate}`);

    // Verify connection
    if (!process.env.HIM_WELLNESS_TTDI_DB) {
      throw new Error('Database connection string not configured');
    }

    // Get daily closing data from invoices joined with procedure_prescriptions
    // Link via patients table using MRN to ensure correct matching
    // Closing criteria:
    // 1. Invoice total > 0 (payment made)
    // 2. There's a matching procedure_prescription (indicating procedure sale)
    // 3. Procedure is NOT Trial
    // 4. Both invoice and procedure link to patients with matching MRN (if MRN exists), or same patient_id
    // 5. For each patient+procedure_code combination, use the EARLIEST invoice date across ALL invoices as the closing date
    //    (This handles installment plans where later payments shouldn't create new closings)
    // 6. Only show closings where the earliest date falls within the last 30 days
    const query = `
      WITH all_patient_procedure_invoices AS (
        -- Find ALL invoices with procedures (not limited to date range) to get earliest dates
        SELECT 
          i.invoice_id,
          i.patient_id,
          p_inv.name as patient_name,
          p_inv.phone_no,
          p_inv.mrn_no,
          i.invoice_date,
          i.invoice_total,
          i.invoice_code,
          i.receipt_code,
          pp.procedure_name,
          pp.procedure_code,
          i.doctor_id,
          CASE 
            WHEN DATE(p_inv.first_visit_date) = DATE(i.invoice_date) THEN true
            ELSE false
          END as is_new_patient
        FROM him_ttdi.invoices i
        INNER JOIN him_ttdi.patients p_inv ON i.patient_id = p_inv.patient_id
        INNER JOIN him_ttdi.procedure_prescriptions pp ON DATE(i.invoice_date) = DATE(pp.prescription_date)
        INNER JOIN him_ttdi.patients p_proc ON pp.patient_id = p_proc.patient_id
        WHERE i.invoice_total > 0
        AND LOWER(pp.procedure_name) NOT LIKE '%trial%'
        AND LOWER(pp.procedure_code) NOT LIKE '%trial%'
        -- Link via MRN if both have MRN, otherwise use patient_id match
        AND (
          (p_inv.mrn_no IS NOT NULL AND p_proc.mrn_no IS NOT NULL AND p_inv.mrn_no = p_proc.mrn_no)
          OR
          ((p_inv.mrn_no IS NULL OR p_proc.mrn_no IS NULL) AND i.patient_id = pp.patient_id)
        )
      ),
      earliest_closing_dates AS (
        -- Find the earliest invoice date for each patient+procedure_code combination
        SELECT 
          patient_id,
          procedure_code,
          MIN(invoice_date::date) as earliest_closing_date
        FROM all_patient_procedure_invoices
        GROUP BY patient_id, procedure_code
      ),
      closings AS (
        -- Get the actual invoice record for the earliest date
        SELECT DISTINCT ON (appi.patient_id, appi.procedure_code)
          appi.invoice_id,
          appi.patient_id,
          appi.patient_name,
          appi.phone_no,
          appi.mrn_no,
          ecd.earliest_closing_date as closing_date,
          appi.invoice_code,
          appi.receipt_code,
          appi.procedure_name,
          appi.procedure_code,
          appi.doctor_id,
          appi.is_new_patient
        FROM all_patient_procedure_invoices appi
        INNER JOIN earliest_closing_dates ecd 
          ON appi.patient_id = ecd.patient_id 
          AND appi.procedure_code = ecd.procedure_code
        WHERE DATE(appi.invoice_date) = ecd.earliest_closing_date
        ORDER BY appi.patient_id, appi.procedure_code, appi.invoice_date ASC
      )
      SELECT 
        c.invoice_id,
        c.patient_id,
        c.patient_name,
        c.phone_no,
        c.mrn_no,
        c.closing_date,
        c.invoice_code,
        c.receipt_code,
        c.procedure_name,
        c.procedure_code,
        d.doctor_name,
        c.is_new_patient
      FROM closings c
      LEFT JOIN him_ttdi.doctors d ON c.doctor_id = d.doctor_id
      WHERE c.closing_date >= $1::date
      AND c.closing_date <= $2::date
      ORDER BY c.closing_date DESC, c.patient_id, c.procedure_code;
    `;

    const result = await pool.query(query, [startDate, endDate]);
    
    console.log('Query result sample:', result.rows.slice(0, 3));
    console.log('Total rows returned:', result.rows.length);
    
    // Calculate total summary (focus on procedure closings, not revenue)
    const totalClosings = result.rows.length;

    // Group by closing date (earliest date per patient+procedure_code)
    const dailyGrouped = result.rows.reduce((acc: any, row: any) => {
      const date = row.closing_date; // Use closing_date (earliest date for this procedure)
      if (!acc[date]) {
        acc[date] = {
          date,
          closings: [],
          count: 0,
        };
      }
      acc[date].closings.push({
        invoiceId: row.invoice_id,
        patientId: row.patient_id,
        patientName: row.patient_name,
        phoneNo: row.phone_no,
        closingDate: row.closing_date, // Earliest date for this patient+procedure
        invoiceCode: row.invoice_code,
        receiptCode: row.receipt_code,
        procedureName: row.procedure_name || 'Unknown Procedure',
        procedureCode: row.procedure_code || 'N/A',
        doctorName: row.doctor_name || 'N/A',
        isNewPatient: row.is_new_patient,
        // Note: invoice_total not included as it may be misleading for installment plans
      });
      acc[date].count += 1;
      return acc;
    }, {});

    // Convert to array and sort by date descending
    const dailyClosings = Object.values(dailyGrouped)
      .map((day: any) => ({
        date: day.date,
        count: day.count,
        closings: day.closings,
      }))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Group by procedure for overall breakdown (focus on procedure, not revenue)
    const procedureBreakdown = result.rows.reduce((acc: any, row: any) => {
      const procedureName = row.procedure_name || 'Unknown Procedure';
      const procedureCode = row.procedure_code || 'N/A';
      const key = `${procedureName}|${procedureCode}`;
      
      if (!acc[key]) {
        acc[key] = {
          procedureName,
          procedureCode,
          count: 0,
        };
      }
      acc[key].count += 1;
      return acc;
    }, {});

    const procedureStats = Object.values(procedureBreakdown)
      .map((proc: any) => ({
        procedureName: proc.procedureName,
        procedureCode: proc.procedureCode,
        count: proc.count,
      }))
      .sort((a: any, b: any) => b.count - a.count); // Sort by count, not revenue

    // Generate chart data: group by date and procedure code
    // First, collect all procedure codes from actual data
    const allProcedureCodes = new Set<string>();
    result.rows.forEach((row: any) => {
      const code = row.procedure_code;
      if (code && code !== 'N/A' && code !== null) {
        allProcedureCodes.add(code);
      }
    });

    console.log('Procedure codes found:', Array.from(allProcedureCodes));
    console.log('Total rows:', result.rows.length);

    // Initialize chart data map with all dates in range
    type ChartDataPoint = { date: string; [key: string]: string | number };
    const chartDataMap = new Map<string, ChartDataPoint>();
    
    // Ensure startDate and endDate are strings (not null)
    if (!startDate || !endDate) {
      throw new Error('startDate and endDate must be provided');
    }
    
    for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayData: ChartDataPoint = { date: dateStr };
      allProcedureCodes.forEach(code => {
        dayData[code] = 0;
      });
      chartDataMap.set(dateStr, dayData);
    }

    // Count closings per date and procedure code
    result.rows.forEach((row: any) => {
      // Handle date conversion - closing_date might be a Date object or string
      let dateStr: string;
      if (row.closing_date instanceof Date) {
        dateStr = row.closing_date.toISOString().split('T')[0];
      } else if (typeof row.closing_date === 'string') {
        dateStr = row.closing_date.split('T')[0];
      } else {
        return; // Skip if date is invalid
      }

      const procedureCode = row.procedure_code;
      if (!procedureCode || procedureCode === 'N/A' || procedureCode === null) {
        return; // Skip invalid procedure codes
      }

      if (chartDataMap.has(dateStr)) {
        const dayData = chartDataMap.get(dateStr)!;
        dayData[procedureCode] = (dayData[procedureCode] || 0) + 1;
      }
    });

    const chartData = Array.from(chartDataMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log('Chart data sample:', chartData.slice(0, 3));
    console.log('Chart data length:', chartData.length);

    const response = {
      dateRange: {
        start: startDate,
        end: endDate,
      },
      totalClosings,
      dailyClosings,
      procedureBreakdown: procedureStats,
      chartData, // Add chart data for line graph
    };

    console.log(`Found ${totalClosings} procedure closings across ${dailyClosings.length} days`);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Database error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorCode = (error as any)?.code;
    const errorDetail = (error as any)?.detail;
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch daily closing data',
        message: errorMessage,
        code: errorCode,
        detail: errorDetail,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack }),
      },
      { status: 500 }
    );
  }
}

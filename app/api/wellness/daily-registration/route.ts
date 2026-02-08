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
      // Use TO_CHAR to get date as string directly, avoiding timezone conversion issues
      const latestDateQuery = `
        SELECT MAX(TO_CHAR(invoice_date, 'YYYY-MM-DD')) as latest_date
        FROM him_ttdi.invoices
        WHERE invoice_total = 50;
      `;
      const latestDateResult = await pool.query(latestDateQuery);
      const latestDate = latestDateResult.rows[0]?.latest_date;
      
      if (latestDate) {
        // latestDate is already a string in YYYY-MM-DD format
        const latestDateObj = new Date(latestDate);
        const defaultStart = new Date(latestDateObj);
        defaultStart.setDate(defaultStart.getDate() - 29); // 30 days including today
        endDate = latestDate; // Already in YYYY-MM-DD format
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

    console.log(`API: /api/wellness/daily-registration - Fetching data from ${startDate} to ${endDate}`);

    // Verify connection
    if (!process.env.HIM_WELLNESS_TTDI_DB) {
      throw new Error('Database connection string not configured');
    }

    // Get daily registration data from invoices with booking fee (RM50)
    // Exclude RM50 invoices that are for consultations (matching consultation with total_payment = 50)
    // Differentiate between new and existing patients:
    // - NEW: This is the patient's FIRST RM50 booking fee (registration for procedure/service)
    // - EXISTING: Patient has had RM50 booking fees before (returning for another procedure/service)
    const query = `
      WITH patient_rm50_invoices AS (
        SELECT 
          i.invoice_id,
          i.patient_id,
          i.invoice_date,
          -- Use TO_CHAR to get date as string directly, avoiding timezone conversion
          TO_CHAR(i.invoice_date, 'YYYY-MM-DD') as invoice_date_str,
          ROW_NUMBER() OVER (
            PARTITION BY i.patient_id 
            ORDER BY TO_CHAR(i.invoice_date, 'YYYY-MM-DD') ASC, 
                     i.invoice_date ASC
          ) as rm50_rank
        FROM him_ttdi.invoices i
        WHERE i.invoice_total = 50
        -- Exclude invoices that match consultations with total_payment = 50
        AND NOT EXISTS (
          SELECT 1 
          FROM him_ttdi.consultations c
          WHERE c.patient_id = i.patient_id
          AND TO_CHAR(c.visit_date, 'YYYY-MM-DD') = TO_CHAR(i.invoice_date, 'YYYY-MM-DD')
          AND c.total_payment = 50
        )
      )
      SELECT 
        i.invoice_id,
        i.patient_id,
        p.name as patient_name,
        p.phone_no,
        p.mrn_no,
        TO_CHAR(i.invoice_date, 'YYYY-MM-DD') as registration_date,
        i.invoice_code,
        i.receipt_code,
        d.doctor_name,
        CASE 
          WHEN pri.rm50_rank = 1 THEN true
          ELSE false
        END as is_new_patient
      FROM him_ttdi.invoices i
      INNER JOIN him_ttdi.patients p ON i.patient_id = p.patient_id
      LEFT JOIN him_ttdi.doctors d ON i.doctor_id = d.doctor_id
      INNER JOIN patient_rm50_invoices pri ON i.invoice_id = pri.invoice_id
      WHERE TO_CHAR(i.invoice_date, 'YYYY-MM-DD') >= $1
      AND TO_CHAR(i.invoice_date, 'YYYY-MM-DD') <= $2
      AND i.invoice_total = 50
      ORDER BY i.invoice_date DESC, i.patient_id;
    `;

    const result = await pool.query(query, [startDate, endDate]);
    console.log(`Found ${result.rows.length} booking fee invoices`);

    // Calculate totals
    const totalRegistrations = result.rows.length;
    const totalNewPatients = result.rows.filter((row: any) => row.is_new_patient === true).length;
    const totalExistingPatients = totalRegistrations - totalNewPatients;

    // Helper function to normalize date to YYYY-MM-DD format
    const normalizeDate = (date: any): string => {
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      } else if (typeof date === 'string') {
        return date.split('T')[0];
      }
      return String(date);
    };

    // Group by date for daily breakdown
    const dailyGrouped = result.rows.reduce((acc: any, row: any) => {
      const dateStr = normalizeDate(row.registration_date);
      if (!acc[dateStr]) {
        acc[dateStr] = {
          date: dateStr,
          registrations: [],
          newPatients: 0,
          existingPatients: 0,
          total: 0,
        };
      }
      acc[dateStr].registrations.push({
        invoiceId: row.invoice_id,
        patientId: row.patient_id,
        patientName: row.patient_name,
        phoneNo: row.phone_no,
        mrnNo: row.mrn_no,
        registrationDate: dateStr,
        invoiceCode: row.invoice_code,
        receiptCode: row.receipt_code,
        doctorName: row.doctor_name || 'N/A',
        isNewPatient: row.is_new_patient,
      });
      acc[dateStr].total += 1;
      if (row.is_new_patient) {
        acc[dateStr].newPatients += 1;
      } else {
        acc[dateStr].existingPatients += 1;
      }
      return acc;
    }, {});

    // Convert to array and sort by date descending
    const dailyRegistrations = Object.values(dailyGrouped)
      .map((day: any) => ({
        date: day.date,
        total: day.total,
        newPatients: day.newPatients,
        existingPatients: day.existingPatients,
        registrations: day.registrations,
      }))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Generate chart data: group by date with new vs existing patients
    const chartDataMap = new Map<string, { date: string; newPatients: number; existingPatients: number; total: number }>();
    
    // Initialize all dates in range with 0 counts
    for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      chartDataMap.set(dateStr, {
        date: dateStr,
        newPatients: 0,
        existingPatients: 0,
        total: 0,
      });
    }

    // Count registrations per date (use same normalizeDate function)
    result.rows.forEach((row: any) => {
      const dateStr = normalizeDate(row.registration_date);

      if (chartDataMap.has(dateStr)) {
        const dayData = chartDataMap.get(dateStr)!;
        dayData.total += 1;
        if (row.is_new_patient) {
          dayData.newPatients += 1;
        } else {
          dayData.existingPatients += 1;
        }
      }
    });

    const chartData = Array.from(chartDataMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const response = {
      dateRange: {
        start: startDate,
        end: endDate,
      },
      totalRegistrations,
      totalNewPatients,
      totalExistingPatients,
      dailyRegistrations,
      chartData,
    };

    console.log(`Found ${totalRegistrations} registrations (${totalNewPatients} new, ${totalExistingPatients} existing)`);
    return NextResponse.json(response);
  } catch (error) {
    console.error('API: /api/wellness/daily-registration - Database error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorCode = (error as any)?.code;
    const errorDetail = (error as any)?.detail;

    return NextResponse.json(
      {
        error: 'Failed to fetch daily registration data',
        message: errorMessage,
        code: errorCode,
        detail: errorDetail,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack }),
      },
      { status: 500 }
    );
  }
}

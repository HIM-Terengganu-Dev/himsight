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
      const dateRangeQuery = `
        SELECT 
          GREATEST(
            COALESCE(MAX(visit_date), '1970-01-01'::date),
            COALESCE(MAX((prescription_date::text::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')::date), '1970-01-01'::date)
          ) as latest_date
        FROM (
          SELECT visit_date, NULL::date as prescription_date FROM him_ttdi.consultations
          UNION ALL
          SELECT NULL::date as visit_date, (prescription_date::text::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')::date as prescription_date FROM him_ttdi.procedure_prescriptions
        ) combined_dates;
      `;
      const dateRangeResult = await pool.query(dateRangeQuery);
      const latestDate = dateRangeResult.rows[0]?.latest_date;
      
      if (latestDate) {
        const defaultStart = new Date(latestDate);
        defaultStart.setDate(defaultStart.getDate() - 13); // 14 days including today
        endDate = typeof latestDate === 'string' ? latestDate : latestDate.toISOString().split('T')[0];
        startDate = defaultStart.toISOString().split('T')[0];
      } else {
        // Fallback if no data
        const today = new Date();
        const defaultStart = new Date();
        defaultStart.setDate(defaultStart.getDate() - 13);
        endDate = today.toISOString().split('T')[0];
        startDate = defaultStart.toISOString().split('T')[0];
      }
    }

    console.log(`API: /api/wellness/occupancy-rate - Fetching data from ${startDate} to ${endDate}`);

    // Verify connection
    if (!process.env.HIM_WELLNESS_TTDI_DB) {
      throw new Error('Database connection string not configured');
    }

    const startDateStr = startDate;
    const endDateStr = endDate;

    // Get daily occupancy data
    // Consultation slots: 16 per day
    // Treatment slots: 32 per day
    const query = `
      WITH date_range AS (
        SELECT generate_series($1::date, $2::date, '1 day'::interval)::date as date
      ),
      daily_consultations AS (
        SELECT 
          visit_date,
          COUNT(*) as consultation_count
        FROM him_ttdi.consultations
        WHERE visit_date >= $1::date
        AND visit_date <= $2::date
        GROUP BY visit_date
      ),
      daily_procedures AS (
        SELECT 
          (prescription_date::text::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')::date as procedure_date,
          COUNT(*) as procedure_count
        FROM him_ttdi.procedure_prescriptions
        WHERE (prescription_date::text::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')::date >= $1::date
        AND (prescription_date::text::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')::date <= $2::date
        GROUP BY (prescription_date::text::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')::date
      )
      SELECT 
        TO_CHAR(dr.date, 'YYYY-MM-DD') as date,
        COALESCE(dc.consultation_count, 0)::integer as consultation_count,
        COALESCE(dp.procedure_count, 0)::integer as procedure_count,
        -- Calculate occupancy rates
        ROUND((COALESCE(dc.consultation_count, 0)::numeric / 16.0 * 100), 2) as consultation_occupancy_rate,
        ROUND((COALESCE(dp.procedure_count, 0)::numeric / 32.0 * 100), 2) as treatment_occupancy_rate
      FROM date_range dr
      LEFT JOIN daily_consultations dc ON dr.date = dc.visit_date
      LEFT JOIN daily_procedures dp ON dr.date = dp.procedure_date
      ORDER BY dr.date DESC;
    `;

    const result = await pool.query(query, [startDateStr, endDateStr]);
    console.log(`Found occupancy data for ${result.rows.length} days`);

    // Calculate summary statistics
    const totalDays = result.rows.length;
    const avgConsultationOccupancy = totalDays > 0
      ? result.rows.reduce((sum, row) => sum + parseFloat(row.consultation_occupancy_rate || 0), 0) / totalDays
      : 0;
    const avgTreatmentOccupancy = totalDays > 0
      ? result.rows.reduce((sum, row) => sum + parseFloat(row.treatment_occupancy_rate || 0), 0) / totalDays
      : 0;

    // Helper function to normalize date to YYYY-MM-DD string format
    // Dates are now returned as strings from PostgreSQL, so this is mainly for safety
    const normalizeDate = (date: any): string => {
      if (typeof date === 'string') {
        // If it's already a string, just take the date part
        return date.split('T')[0].split(' ')[0];
      } else if (date instanceof Date) {
        // Fallback: if somehow we still get a Date object, use local date methods
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      // If it's something else, convert to string and extract date part
      return String(date).split('T')[0].split(' ')[0];
    };

    // Format daily data
    const dailyOccupancy = result.rows.map((row: any) => ({
      date: normalizeDate(row.date),
      consultationCount: row.consultation_count,
      procedureCount: row.procedure_count,
      consultationOccupancyRate: parseFloat(row.consultation_occupancy_rate || 0),
      treatmentOccupancyRate: parseFloat(row.treatment_occupancy_rate || 0),
    }));

    // Generate chart data for consultation (line graph)
    const consultationChartData = result.rows
      .map((row: any) => ({
        date: normalizeDate(row.date),
        consultationOccupancy: parseFloat(row.consultation_occupancy_rate || 0),
        consultationCount: row.consultation_count,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Get procedure breakdown by code for stacked bar chart
    // Note: prescription_date is stored as timestamp without timezone in Malaysia time
    // We need to explicitly treat it as Asia/Kuala_Lumpur timezone before extracting date
    // Format as string to avoid timezone conversion issues
    const procedureBreakdownQuery = `
      SELECT 
        TO_CHAR((prescription_date::text::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')::date, 'YYYY-MM-DD') as procedure_date,
        procedure_code,
        procedure_name,
        COUNT(*) as procedure_count
      FROM him_ttdi.procedure_prescriptions
      WHERE (prescription_date::text::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')::date >= $1::date
      AND (prescription_date::text::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')::date <= $2::date
      AND procedure_code IS NOT NULL
      GROUP BY (prescription_date::text::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')::date, procedure_code, procedure_name
      ORDER BY (prescription_date::text::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')::date, procedure_code;
    `;

    const procedureBreakdownResult = await pool.query(procedureBreakdownQuery, [startDateStr, endDateStr]);
    
    console.log(`Found ${procedureBreakdownResult.rows.length} procedure breakdown rows`);
    
    // Group procedure data by date for stacked bar chart
    const procedureChartDataMap = new Map<string, { date: string; [procedureCode: string]: number }>();
    
    // Get all unique procedure codes from actual data
    const allProcedureCodes = new Set<string>();
    procedureBreakdownResult.rows.forEach((row: any) => {
      if (row.procedure_code) {
        allProcedureCodes.add(row.procedure_code);
      }
    });

    console.log(`Found ${allProcedureCodes.size} unique procedure codes:`, Array.from(allProcedureCodes));

    // Initialize all dates with 0 counts for all procedure codes
    result.rows.forEach((row: any) => {
      const dateStr = normalizeDate(row.date);
      const dayData: any = { date: dateStr };
      allProcedureCodes.forEach(code => {
        dayData[code] = 0;
      });
      procedureChartDataMap.set(dateStr, dayData);
    });

    // Fill in actual counts
    procedureBreakdownResult.rows.forEach((row: any) => {
      const dateStr = normalizeDate(row.procedure_date);
      const procedureCode = row.procedure_code;
      if (procedureChartDataMap.has(dateStr) && procedureCode) {
        const dayData = procedureChartDataMap.get(dateStr)!;
        dayData[procedureCode] = parseInt(row.procedure_count) || 0;
      }
    });

    const procedureChartData = Array.from(procedureChartDataMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Get procedure code names for legend
    const procedureCodeNames = Array.from(allProcedureCodes).map(code => {
      const sample = procedureBreakdownResult.rows.find((r: any) => r.procedure_code === code);
      return {
        code,
        name: sample?.procedure_name || code,
      };
    });

    const response = {
      dateRange: {
        start: startDateStr,
        end: endDateStr,
      },
      dailyOccupancy,
      consultationChartData: consultationChartData,
      procedureChartData: procedureChartData,
      procedureCodeNames: procedureCodeNames,
      summary: {
        avgConsultationOccupancy: Math.round(avgConsultationOccupancy * 100) / 100,
        avgTreatmentOccupancy: Math.round(avgTreatmentOccupancy * 100) / 100,
      },
    };

    console.log(`Average consultation occupancy: ${avgConsultationOccupancy.toFixed(2)}%`);
    console.log(`Average treatment occupancy: ${avgTreatmentOccupancy.toFixed(2)}%`);
    return NextResponse.json(response);
  } catch (error) {
    console.error('API: /api/wellness/occupancy-rate - Database error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorCode = (error as any)?.code;
    const errorDetail = (error as any)?.detail;

    return NextResponse.json(
      {
        error: 'Failed to fetch occupancy rate data',
        message: errorMessage,
        code: errorCode,
        detail: errorDetail,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack }),
      },
      { status: 500 }
    );
  }
}

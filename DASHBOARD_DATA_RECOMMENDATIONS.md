# Daily Sales Dashboard - Database Recommendations

## For HIM Wellness TTDI Dashboard

Based on the `him_ttdi` schema analysis, here are the recommended tables and columns for the Daily Sales Dashboard:

### Primary Data Sources

#### 1. **Daily Sales Summary** - Use `daily_doctor_sales` table
```sql
SELECT 
  sale_date,
  SUM(total_sales) as total_revenue,
  SUM(visit_count) as total_visits,
  AVG(total_sales / NULLIF(visit_count, 0)) as avg_transaction
FROM him_ttdi.daily_doctor_sales
WHERE sale_date = CURRENT_DATE
GROUP BY sale_date;
```

**Columns:**
- `sale_date` - Filter for today's date
- `total_sales` - Sum for total revenue
- `visit_count` - Sum for total visits
- Calculate average transaction value

---

#### 2. **Sales Breakdown by Category** - Use `itemized_sales` table
```sql
SELECT 
  SUM(consultation_amount) as consultation,
  SUM(medicine_amount) as medicine,
  SUM(procedure_amount) as procedures,
  SUM(lab_amount) as lab_tests,
  SUM(imaging_amount) as imaging,
  SUM(general_amount) as general,
  SUM(package_amount) as packages
FROM him_ttdi.itemized_sales
WHERE visit_date = CURRENT_DATE;
```

**Columns:**
- `visit_date` - Filter for today
- `consultation_amount`
- `medicine_amount`
- `procedure_amount`
- `lab_amount`
- `imaging_amount`
- `general_amount`
- `package_amount`

---

#### 3. **Doctor Performance** - Use `v_doctor_performance` view + `daily_doctor_sales`
```sql
-- For today's performance
SELECT 
  d.doctor_name,
  dds.visit_count,
  dds.total_sales,
  -- Calculate trend from yesterday
  CASE 
    WHEN prev.total_sales > 0 
    THEN ROUND(((dds.total_sales - prev.total_sales) / prev.total_sales * 100), 1)
    ELSE 0
  END as trend_percentage
FROM him_ttdi.daily_doctor_sales dds
JOIN him_ttdi.doctors d ON d.doctor_id = dds.doctor_id
LEFT JOIN him_ttdi.daily_doctor_sales prev 
  ON prev.doctor_id = dds.doctor_id 
  AND prev.sale_date = CURRENT_DATE - INTERVAL '1 day'
WHERE dds.sale_date = CURRENT_DATE
ORDER BY dds.total_sales DESC;
```

**Tables:**
- `daily_doctor_sales` - Today's stats
- `doctors` - Doctor names
- Join with previous day for trend calculation

---

#### 4. **Recent Transactions** - Use `consultations` + `itemized_sales`
```sql
SELECT 
  c.visit_time,
  p.name as patient_name,
  d.doctor_name,
  c.total_payment,
  c.end_payment_date IS NOT NULL as is_paid
FROM him_ttdi.consultations c
JOIN him_ttdi.patients p ON p.patient_id = c.patient_id
JOIN him_ttdi.doctors d ON d.doctor_id = c.doctor_id
WHERE c.visit_date = CURRENT_DATE
ORDER BY c.visit_time DESC
LIMIT 10;
```

**Or use `invoices` table:**
```sql
SELECT 
  i.invoice_date,
  p.name as patient_name,
  d.doctor_name,
  i.invoice_total,
  i.payment_method,
  CASE 
    WHEN i.invoice_date IS NOT NULL THEN 'paid'
    ELSE 'pending'
  END as status
FROM him_ttdi.invoices i
JOIN him_ttdi.patients p ON p.patient_id = i.patient_id
JOIN him_ttdi.doctors d ON d.doctor_id = i.doctor_id
WHERE DATE(i.invoice_date) = CURRENT_DATE
ORDER BY i.invoice_date DESC
LIMIT 10;
```

---

#### 5. **Pending Payments** - Use `itemized_sales` or `invoices`
```sql
-- Using itemized_sales
SELECT 
  COUNT(*) as pending_count,
  SUM(total_amount) as pending_total
FROM him_ttdi.itemized_sales
WHERE visit_date = CURRENT_DATE
  AND payment_status = 'pending';

-- Or calculate from consultations
SELECT 
  COUNT(*) as pending_count,
  SUM(total_payment) as pending_total
FROM him_ttdi.consultations
WHERE visit_date = CURRENT_DATE
  AND end_payment_date IS NULL;
```

---

### Recommended Implementation Approach

1. **Create API Routes** in Next.js:
   - `/api/wellness/daily-summary` - Today's totals
   - `/api/wellness/sales-breakdown` - Category breakdown
   - `/api/wellness/doctor-performance` - Doctor stats
   - `/api/wellness/recent-transactions` - Latest transactions

2. **Add Branch Filter**: 
   - Currently, the schema doesn't have a `branch` column
   - **Recommendation**: Add a `branch` column to key tables:
     - `consultations.branch` (varchar(50))
     - `invoices.branch` (varchar(50))
     - `itemized_sales.branch` (varchar(50))
     - `daily_doctor_sales.branch` (varchar(50))
   - Or create a separate `branches` table with foreign keys

3. **For Now (Without Branch Column)**:
   - Assume all data in `him_ttdi` schema is TTDI branch
   - Create a separate schema `him_bukit_jelutong` for the second branch
   - Use query parameter to switch between schemas

---

### Migration Script (Recommended)

```sql
-- Add branch column to key tables
ALTER TABLE him_ttdi.consultations ADD COLUMN branch VARCHAR(50) DEFAULT 'TTDI';
ALTER TABLE him_ttdi.invoices ADD COLUMN branch VARCHAR(50) DEFAULT 'TTDI';
ALTER TABLE him_ttdi.itemized_sales ADD COLUMN branch VARCHAR(50) DEFAULT 'TTDI';
ALTER TABLE him_ttdi.daily_doctor_sales ADD COLUMN branch VARCHAR(50) DEFAULT 'TTDI';

-- Create index for performance
CREATE INDEX idx_consultations_branch_date ON him_ttdi.consultations(branch, visit_date);
CREATE INDEX idx_itemized_sales_branch_date ON him_ttdi.itemized_sales(branch, visit_date);
CREATE INDEX idx_daily_doctor_sales_branch_date ON him_ttdi.daily_doctor_sales(branch, sale_date);
```

---

### Summary Table

| Dashboard Metric | Primary Table | Key Columns |
|-----------------|---------------|-------------|
| Today's Sales | `daily_doctor_sales` | `sale_date`, `total_sales` |
| Total Visits | `daily_doctor_sales` | `sale_date`, `visit_count` |
| Avg Transaction | `daily_doctor_sales` | `total_sales / visit_count` |
| Sales Breakdown | `itemized_sales` | `*_amount` columns |
| Doctor Performance | `daily_doctor_sales` + `doctors` | `doctor_name`, `visit_count`, `total_sales` |
| Recent Transactions | `consultations` or `invoices` | `visit_time`, `patient_id`, `doctor_id`, `total_payment` |
| Pending Payments | `itemized_sales` or `consultations` | `payment_status`, `end_payment_date` |

---

### Next Steps

1. Create API routes to fetch real data from PostgreSQL
2. Add branch column to database (or use schema separation)
3. Replace mock data in the dashboard with live data
4. Add real-time updates (optional: use WebSockets or polling)
5. Add date range selector for historical data

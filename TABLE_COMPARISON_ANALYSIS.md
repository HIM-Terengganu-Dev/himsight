# Table Comparison Analysis: daily_doctor_sales vs invoices vs itemized_sales

## Executive Summary

**RECOMMENDATION: Use `invoices` table as PRIMARY source for daily sales dashboard**

Why? It's the single source of truth for actual billing/revenue with complete payment information.

---

## Detailed Comparison

### 1. **daily_doctor_sales Table**

**Structure:**
- `daily_sale_id` (PK)
- `sale_date` (date, NOT NULL)
- `doctor_id` (FK)
- `visit_count` (integer)
- `total_sales` (numeric)
- `created_at`, `updated_at`

**Purpose:** 
- Pre-aggregated daily summary per doctor
- Performance optimization for reporting

**✅ PROS:**
- Fast queries (already aggregated)
- Simple structure
- Good for historical trend analysis
- Optimized for doctor-specific reports

**❌ CONS:**
- **Aggregated data** - Cannot drill down to individual transactions
- **Doctor-centric** - Doesn't help if you need total daily sales across all doctors
- **No payment details** - No payment method, status, or breakdown
- **No detailed breakdown** - Just total sales, no category breakdown
- **Dependency risk** - Relies on external process to populate/update it
- **Data accuracy** - If aggregation process fails, data is incomplete
- **No patient info** - Cannot see which patients contributed to sales
- **Limited use cases** - Only useful for doctor performance tracking

---

### 2. **invoices Table**

**Structure:**
- `invoice_id` (PK)
- `patient_id` (FK)
- `doctor_id` (FK)
- `invoice_date` (timestamp, NOT NULL)
- `invoice_code`, `receipt_code`, `ref_no`
- `invoice_total` (numeric, NOT NULL) ⭐
- `payment_method` ⭐
- `tpa_panel_name` (third-party admin)
- `employee_policy_details`
- `remark`
- `created_at`, `updated_at`

**Purpose:**
- Actual billing/invoice records
- Financial transactions
- Revenue tracking

**✅ PROS:**
- **Transactional data** - Each row is a real invoice
- **Complete financial info** - Invoice total, payment method, codes
- **Patient & doctor linkage** - Full context
- **Timestamp precision** - Exact billing time
- **Payment tracking** - Payment method available
- **Flexible aggregation** - Can aggregate by day/doctor/patient/method
- **Audit trail** - Invoice codes, receipt codes, ref numbers
- **TPA tracking** - Third-party admin/insurance panel tracking

**❌ CONS:**
- **No category breakdown** - Total only, no split by service type
- **Requires aggregation** - Need SUM/COUNT queries for totals
- **Slightly slower** - Query performance vs pre-aggregated data

---

### 3. **itemized_sales Table**

**Structure:**
- `sale_id` (PK)
- `patient_id` (FK), `doctor_id` (FK)
- `visit_date` (date), `visit_time` (time)
- `invoice_code`, `receipt_code`
- **Category breakdowns:**
  - `consultation_amount`
  - `medicine_amount`
  - `procedure_amount`
  - `dispensing_amount`
  - `lab_amount`
  - `imaging_amount`
  - `general_amount`
  - `package_amount`
  - `discount_amount`
  - `tax_amount`
  - `total_amount`
- `payment_status` ⭐
- `paid_at` ⭐
- `created_at`, `updated_at`

**Purpose:**
- Detailed sales breakdown by category
- Service-level revenue tracking

**✅ PROS:**
- **Detailed breakdown** - 10+ category amounts
- **Payment status** - Paid vs pending ⭐
- **Payment timestamp** - When payment was made
- **Discount & tax tracking** - Complete pricing details
- **Perfect for charts** - Category breakdown visualizations
- **Invoice linkage** - Links via invoice_code

**❌ CONS:**
- **No payment method** - Missing how payment was made
- **Requires aggregation** - Like invoices, needs SUM queries
- **Potential duplicates** - Unclear if one sale = one invoice

---

## Comparison Table

| Feature | daily_doctor_sales | invoices | itemized_sales |
|---------|-------------------|----------|----------------|
| **Granularity** | Aggregated (daily) | Transactional | Transactional |
| **Query Speed** | ⚡ Fastest | 🔸 Moderate | 🔸 Moderate |
| **Total Sales** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Payment Method** | ❌ No | ✅ Yes | ❌ No |
| **Payment Status** | ❌ No | ❌ No | ✅ Yes (paid/pending) |
| **Category Breakdown** | ❌ No | ❌ No | ✅ Yes (10+ categories) |
| **Patient Details** | ❌ No | ✅ Yes (FK) | ✅ Yes (FK) |
| **Doctor Details** | ✅ Yes (FK) | ✅ Yes (FK) | ✅ Yes (FK) |
| **Timestamp Precision** | Date only | ✅ Timestamp | Date + Time |
| **Invoice Codes** | ❌ No | ✅ Yes | ✅ Yes |
| **Drill-down Ability** | ❌ No | ✅ Yes | ✅ Yes |
| **Data Reliability** | 🔸 Depends on ETL | ✅ Source of truth | 🔸 Derived? |
| **Discount/Tax** | ❌ No | ❌ No | ✅ Yes |
| **TPA/Insurance** | ❌ No | ✅ Yes | ❌ No |

---

## RECOMMENDED APPROACH

### **Use BOTH `invoices` and `itemized_sales`**

#### Primary Source: **invoices**
Use for:
- ✅ Total daily sales
- ✅ Total visit count (COUNT of invoices)
- ✅ Average transaction value
- ✅ Payment method breakdown
- ✅ Recent transactions list
- ✅ Patient & doctor details
- ✅ TPA/insurance tracking

#### Secondary Source: **itemized_sales**
Use for:
- ✅ Sales breakdown by category (consultation, medicine, procedures, etc.)
- ✅ Payment status (paid vs pending)
- ✅ Discount and tax analysis

---

## SQL Queries for Dashboard

### 1. Today's Total Sales (invoices)
```sql
SELECT 
  COUNT(*) as total_visits,
  SUM(invoice_total) as total_sales,
  AVG(invoice_total) as avg_transaction,
  COUNT(CASE WHEN payment_method IS NOT NULL THEN 1 END) as paid_count
FROM him_ttdi.invoices
WHERE DATE(invoice_date) = CURRENT_DATE;
```

### 2. Sales Breakdown by Category (itemized_sales)
```sql
SELECT 
  SUM(consultation_amount) as consultation,
  SUM(medicine_amount) as medicine,
  SUM(procedure_amount) as procedures,
  SUM(lab_amount) as lab_tests,
  SUM(imaging_amount) as imaging,
  SUM(general_amount) as general,
  SUM(package_amount) as packages,
  SUM(discount_amount) as discounts,
  SUM(tax_amount) as taxes,
  SUM(total_amount) as total
FROM him_ttdi.itemized_sales
WHERE visit_date = CURRENT_DATE;
```

### 3. Pending Payments (itemized_sales)
```sql
SELECT 
  COUNT(*) as pending_count,
  SUM(total_amount) as pending_total
FROM him_ttdi.itemized_sales
WHERE visit_date = CURRENT_DATE
  AND payment_status = 'pending';
```

### 4. Recent Transactions (invoices with joins)
```sql
SELECT 
  i.invoice_date,
  i.invoice_code,
  p.name as patient_name,
  d.doctor_name,
  i.invoice_total,
  i.payment_method,
  CASE 
    WHEN i.payment_method IS NOT NULL THEN 'paid'
    ELSE 'pending'
  END as status
FROM him_ttdi.invoices i
JOIN him_ttdi.patients p ON p.patient_id = i.patient_id
JOIN him_ttdi.doctors d ON d.doctor_id = i.doctor_id
WHERE DATE(i.invoice_date) = CURRENT_DATE
ORDER BY i.invoice_date DESC
LIMIT 20;
```

### 5. Payment Method Breakdown (invoices)
```sql
SELECT 
  payment_method,
  COUNT(*) as count,
  SUM(invoice_total) as total
FROM him_ttdi.invoices
WHERE DATE(invoice_date) = CURRENT_DATE
  AND payment_method IS NOT NULL
GROUP BY payment_method
ORDER BY total DESC;
```

---

## Data Relationship Investigation Needed

**QUESTION: How are these tables related?**

Potential scenarios:
1. **Scenario A**: `itemized_sales` is derived from `invoices`
   - One invoice → One itemized_sales entry (linked by invoice_code)
   - `itemized_sales.total_amount` should equal `invoices.invoice_total`

2. **Scenario B**: `daily_doctor_sales` is aggregated from `invoices`
   - Daily batch job sums up invoices per doctor per day
   - Data redundancy for performance

3. **Scenario C**: They track different things
   - `invoices` = billing
   - `itemized_sales` = actual services delivered
   - Might not always match (discounts, cancellations, etc.)

**Recommended SQL to verify:**
```sql
-- Check if invoice totals match itemized_sales totals
SELECT 
  i.invoice_code,
  i.invoice_total,
  s.total_amount,
  (i.invoice_total - s.total_amount) as difference
FROM him_ttdi.invoices i
LEFT JOIN him_ttdi.itemized_sales s ON s.invoice_code = i.invoice_code
WHERE DATE(i.invoice_date) = CURRENT_DATE
  AND ABS(i.invoice_total - COALESCE(s.total_amount, 0)) > 0.01;
```

---

## Final Recommendation

### **Best Practice: Use `invoices` as primary source**

**Why?**
1. **Single source of truth** - Actual billing records
2. **Complete information** - Payment method, TPA, codes
3. **Reliable** - Not dependent on ETL processes
4. **Flexible** - Can aggregate any way needed
5. **Audit-ready** - Complete transaction trail

**Use `itemized_sales` as secondary for:**
- Category breakdowns (for pie charts)
- Payment status tracking
- Detailed service analysis

**Avoid `daily_doctor_sales` for main dashboard:**
- Too limited (doctor-centric only)
- Pre-aggregated (less flexible)
- Risk of stale data
- Use only for specific doctor performance reports (which you don't need now)

---

## Next Steps

1. ✅ Remove doctor performance section from dashboard
2. ✅ Query `invoices` table for main metrics
3. ✅ Query `itemized_sales` for category breakdown
4. ✅ Implement proper date filtering
5. ⚠️ Add branch column or schema separation
6. ⚠️ Verify data relationship between tables
7. ⚠️ Add proper indexes for performance

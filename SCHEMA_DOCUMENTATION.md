# HIM TTDI Database Schema Documentation

## Overview
Schema Name: `him_ttdi`  
Database: PostgreSQL (Neon)  
Total Tables: 16 (14 base tables + 2 views)

## Connection Strings
- **Read/Write**: `HIM_WELLNESS_TTDI_DB` (from .env.local)
- **DDL Operations**: `HIM_WELLNESS_TTDI_DB_DDL` (from .env.local)

---

## Table Structure

### Core Entity Tables

#### 1. `patients`
**Purpose**: Patient master data  
**Primary Key**: `patient_id`  
**Key Columns**:
- `patient_id` (int4, PK, auto-increment)
- `mrn_no` (varchar(50)) - Medical Record Number
- `name` (varchar(255))
- `phone_no` (varchar(50), NOT NULL) - Required field
- `email` (varchar(255))
- `date_of_birth` (date)
- `age` (int4)
- `gender` (varchar(20))
- `id_no`, `id_type` - Identification details
- `nationality`, `race`, `ethnicity`, `marital_status`
- `address` (text)
- `visit_total` (int4, default: 0)
- `first_visit_date` (timestamp)
- `created_at`, `updated_at` (timestamp)

**Relationships**:
- Referenced by: `consultations`, `invoices`, `itemized_sales`, `medicine_prescriptions`, `procedure_prescriptions`

---

#### 2. `doctors`
**Purpose**: Doctor master data  
**Primary Key**: `doctor_id`  
**Key Columns**:
- `doctor_id` (int4, PK, auto-increment)
- `doctor_name` (varchar(255), NOT NULL)
- `doctor_code` (varchar(50))
- `created_at`, `updated_at` (timestamp)

**Relationships**:
- Referenced by: `consultations`, `invoices`, `itemized_sales`, `daily_doctor_sales`, `medicine_prescriptions`, `procedure_prescriptions`

---

#### 3. `consultations`
**Purpose**: Patient consultation records  
**Primary Key**: `consultation_id`  
**Key Columns**:
- `consultation_id` (int4, PK, auto-increment)
- `patient_id` (int4, FK → patients.patient_id)
- `doctor_id` (int4, FK → doctors.doctor_id)
- `visit_date` (date, NOT NULL)
- `visit_time` (time)
- `start_treatment_date`, `start_treatment_time`
- `end_treatment_date`, `end_treatment_time`
- `end_pharmacy_date`, `end_pharmacy_time`
- `end_payment_date`, `end_payment_time`
- `diagnosis` (text)
- `prescription` (text)
- `procedures`, `disposables`, `imagings`, `generals`, `lab_tests`, `packages` (text)
- `total_payment` (numeric, default: 0)
- `created_at`, `updated_at` (timestamp)

**Relationships**:
- Foreign Keys: `patient_id`, `doctor_id`

---

#### 4. `invoices`
**Purpose**: Invoice/billing records  
**Primary Key**: `invoice_id`  
**Key Columns**:
- `invoice_id` (int4, PK, auto-increment)
- `patient_id` (int4, FK → patients.patient_id)
- `doctor_id` (int4, FK → doctors.doctor_id)
- `invoice_date` (timestamp, NOT NULL)
- `invoice_code` (varchar(100))
- `receipt_code` (varchar(100))
- `ref_no` (varchar(100))
- `invoice_total` (numeric, NOT NULL)
- `payment_method` (varchar(50))
- `tpa_panel_name` (varchar(255)) - Third Party Administrator
- `employee_policy_details` (text)
- `remark` (text)
- `created_at`, `updated_at` (timestamp)

**Relationships**:
- Foreign Keys: `patient_id`, `doctor_id`

---

#### 5. `itemized_sales`
**Purpose**: Detailed sales breakdown by category  
**Primary Key**: `sale_id`  
**Key Columns**:
- `sale_id` (int4, PK, auto-increment)
- `patient_id` (int4, FK → patients.patient_id)
- `doctor_id` (int4, FK → doctors.doctor_id)
- `visit_date` (date, NOT NULL)
- `visit_time` (time)
- `invoice_code`, `receipt_code` (varchar(100))
- **Amount Breakdown**:
  - `consultation_amount` (numeric, default: 0)
  - `medicine_amount` (numeric, default: 0)
  - `procedure_amount` (numeric, default: 0)
  - `dispensing_amount` (numeric, default: 0)
  - `lab_amount` (numeric, default: 0)
  - `imaging_amount` (numeric, default: 0)
  - `general_amount` (numeric, default: 0)
  - `package_amount` (numeric, default: 0)
  - `discount_amount` (numeric, default: 0)
  - `tax_amount` (numeric, default: 0)
  - `total_amount` (numeric, default: 0)
- `payment_status` (varchar(50))
- `paid_at` (timestamp)
- `created_at`, `updated_at` (timestamp)

**Relationships**:
- Foreign Keys: `patient_id`, `doctor_id`

---

#### 6. `daily_doctor_sales`
**Purpose**: Daily aggregated sales by doctor  
**Primary Key**: `daily_sale_id`  
**Key Columns**:
- `daily_sale_id` (int4, PK, auto-increment)
- `sale_date` (date, NOT NULL)
- `doctor_id` (int4, FK → doctors.doctor_id)
- `visit_count` (int4, default: 0)
- `total_sales` (numeric, default: 0)
- `created_at`, `updated_at` (timestamp)

**Relationships**:
- Foreign Key: `doctor_id`

---

### Prescription Tables

#### 7. `medicine_prescriptions`
**Purpose**: Medicine prescription records  
**Primary Key**: `prescription_id`  
**Key Columns**:
- `prescription_id` (int4, PK, auto-increment)
- `patient_id` (int4, FK → patients.patient_id)
- `prescribing_doctor_id` (int4, FK → doctors.doctor_id)
- `dispensing_staff` (varchar(255))
- `prescription_date` (timestamp, NOT NULL)
- `diagnosis` (text)
- `medicine_name` (varchar(255))
- `medicine_code` (varchar(50))
- `quantity` (varchar(50))
- `created_at`, `updated_at` (timestamp)

**Relationships**:
- Foreign Keys: `patient_id`, `prescribing_doctor_id`

---

#### 8. `procedure_prescriptions`
**Purpose**: Procedure prescription records  
**Primary Key**: `prescription_id`  
**Key Columns**:
- `prescription_id` (int4, PK, auto-increment)
- `patient_id` (int4, FK → patients.patient_id)
- `prescribing_doctor_id` (int4, FK → doctors.doctor_id)
- `dispensing_staff` (varchar(255))
- `prescription_date` (timestamp, NOT NULL)
- `diagnosis` (text)
- `procedure_name` (varchar(255))
- `procedure_code` (varchar(50))
- `quantity` (varchar(50))
- `created_at`, `updated_at` (timestamp)

**Relationships**:
- Foreign Keys: `patient_id`, `prescribing_doctor_id`

---

### Lead Management Tables

#### 9. `leads`
**Purpose**: Lead/customer prospect data  
**Primary Key**: `lead_id`  
**Key Columns**:
- `lead_id` (int4, PK, auto-increment)
- `lead_external_id` (varchar(255))
- `username` (varchar(255))
- `name` (varchar(500))
- `phone_number`, `email`
- `work_phone`, `work_email`
- `address`, `postal_code`, `city`, `province_state`, `country` (text/varchar)
- `gender` (varchar(50))
- `company_name`, `job_title` (varchar(255))
- `first_name`, `last_name` (varchar(255))
- `received_date`, `received_time`
- `status` (varchar(100))
- `source_traffic`, `source_action`, `source_scenario` (varchar(100))
- **Social Media Fields** (varchar(255)):
  - `zalo`, `line`, `whatsapp`, `messenger`, `instagram`, `facebook`
  - `telegram`, `snapchat`, `skype`, `wechat`, `kakaotalk`, `viber`
  - `twitter`, `linkedin`, `weibo`, `tiktok`
- `source_id` (int4, FK → lead_sources.source_id)
- `created_at`, `updated_at` (timestamp)

**Relationships**:
- Foreign Key: `source_id`
- Many-to-Many: `lead_sources` (via `lead_source_assignments`)
- Many-to-Many: `lead_tags` (via `lead_tag_assignments`)

---

#### 10. `lead_sources`
**Purpose**: Lead source master data  
**Primary Key**: `source_id`  
**Key Columns**:
- `source_id` (int4, PK, auto-increment)
- `source_name` (varchar(255), NOT NULL)
- `created_at`, `updated_at` (timestamp)

**Relationships**:
- Referenced by: `leads`, `lead_source_assignments`

---

#### 11. `lead_tags`
**Purpose**: Lead tag/category master data  
**Primary Key**: `tag_id`  
**Key Columns**:
- `tag_id` (int4, PK, auto-increment)
- `tag_name` (varchar(255), NOT NULL)
- `created_at`, `updated_at` (timestamp)

**Relationships**:
- Referenced by: `lead_tag_assignments`

---

#### 12. `lead_source_assignments`
**Purpose**: Many-to-many relationship between leads and sources  
**Primary Key**: `assignment_id`  
**Key Columns**:
- `assignment_id` (int4, PK, auto-increment)
- `lead_id` (int4, FK → leads.lead_id, NOT NULL)
- `source_id` (int4, FK → lead_sources.source_id, NOT NULL)
- `created_at` (timestamp, default: now())

**Relationships**:
- Foreign Keys: `lead_id`, `source_id`

---

#### 13. `lead_tag_assignments`
**Purpose**: Many-to-many relationship between leads and tags  
**Primary Key**: `assignment_id`  
**Key Columns**:
- `assignment_id` (int4, PK, auto-increment)
- `lead_id` (int4, FK → leads.lead_id, NOT NULL)
- `tag_id` (int4, FK → lead_tags.tag_id, NOT NULL)
- `created_at` (timestamp, default: now())

**Relationships**:
- Foreign Keys: `lead_id`, `tag_id`

---

### Utility Tables

#### 14. `csv_uploads`
**Purpose**: Track CSV file uploads and processing  
**Primary Key**: `upload_id`  
**Key Columns**:
- `upload_id` (int4, PK, auto-increment)
- `file_name` (varchar(255), NOT NULL)
- `table_name` (varchar(100), NOT NULL) - Target table for import
- `rows_processed`, `rows_inserted`, `rows_updated`, `rows_failed` (int4, default: 0)
- `upload_status` (varchar(50), default: 'pending')
- `error_message` (text)
- `uploaded_by` (varchar(255))
- `uploaded_at` (timestamp, default: CURRENT_TIMESTAMP)
- `file_hash` (varchar(64))
- `file_path` (text)
- `metadata` (jsonb, default: '{}')

---

### Views

#### 15. `v_doctor_performance`
**Purpose**: Aggregated doctor performance metrics  
**Columns**:
- `doctor_id` (int4)
- `doctor_name` (varchar(255))
- `total_consultations` (bigint)
- `unique_patients` (bigint)
- `total_revenue` (numeric)
- `avg_consultation_value` (numeric)

**Use Case**: Dashboard analytics for doctor performance

---

#### 16. `v_patient_summary`
**Purpose**: Aggregated patient summary with visit statistics  
**Columns**:
- `patient_id` (int4)
- `mrn_no` (varchar(50))
- `name` (varchar(255))
- `phone_no` (varchar(50))
- `email` (varchar(255))
- `first_visit_date` (timestamp)
- `visit_total` (int4)
- `consultation_count` (bigint)
- `invoice_count` (bigint)
- `total_spent` (numeric)

**Use Case**: Patient overview and analytics

---

## Entity Relationship Summary

### Core Relationships
```
patients (1) ──< (N) consultations
patients (1) ──< (N) invoices
patients (1) ──< (N) itemized_sales
patients (1) ──< (N) medicine_prescriptions
patients (1) ──< (N) procedure_prescriptions

doctors (1) ──< (N) consultations
doctors (1) ──< (N) invoices
doctors (1) ──< (N) itemized_sales
doctors (1) ──< (N) daily_doctor_sales
doctors (1) ──< (N) medicine_prescriptions
doctors (1) ──< (N) procedure_prescriptions

leads (N) ──< (N) lead_sources (via lead_source_assignments)
leads (N) ──< (N) lead_tags (via lead_tag_assignments)
leads (1) ──< (N) lead_source_assignments
leads (1) ──< (N) lead_tag_assignments
```

---

## Key Business Logic Notes

1. **Consultations** track the full patient visit lifecycle with timestamps for:
   - Visit start
   - Treatment start/end
   - Pharmacy completion
   - Payment completion

2. **Itemized Sales** provides detailed revenue breakdown by category (consultation, medicine, procedures, lab, imaging, etc.)

3. **Daily Doctor Sales** aggregates sales data by doctor per day for reporting

4. **Lead Management** supports:
   - Multiple sources per lead (many-to-many)
   - Multiple tags per lead (many-to-many)
   - Extensive social media contact information
   - Source tracking (traffic, action, scenario)

5. **CSV Uploads** tracks data import operations with detailed status and error reporting

6. **Views** provide pre-aggregated analytics for:
   - Doctor performance metrics
   - Patient summary statistics

---

## Recommended Dashboard Pages

Based on the schema, consider creating:

1. **Patient Management**
   - Patient list/search
   - Patient detail view (with consultation history)
   - Patient summary dashboard

2. **Doctor Management**
   - Doctor list
   - Doctor performance dashboard (using `v_doctor_performance`)
   - Daily sales by doctor

3. **Consultations**
   - Consultation calendar/timeline
   - Consultation detail view
   - Consultation analytics

4. **Financial**
   - Invoice management
   - Sales analytics (using `itemized_sales`)
   - Revenue reports

5. **Prescriptions**
   - Medicine prescriptions
   - Procedure prescriptions
   - Prescription history by patient

6. **Lead Management**
   - Lead list with filters
   - Lead detail view
   - Lead source analytics
   - Lead tag management

7. **Data Import**
   - CSV upload interface
   - Upload history and status

---

## Next.js Implementation Notes

1. **Database Client**: Use `pg` or `@vercel/postgres` for PostgreSQL connections
2. **Connection Strings**: Load from `.env.local`:
   - `HIM_WELLNESS_TTDI_DB` for read/write operations
   - `HIM_WELLNESS_TTDI_DB_DDL` for schema changes (if needed)

3. **Schema Prefix**: Always use `him_ttdi` schema prefix in queries:
   ```sql
   SELECT * FROM him_ttdi.patients;
   ```

4. **Type Safety**: Consider generating TypeScript types from the schema using tools like `pg-to-ts` or similar

5. **API Routes**: Create Next.js API routes for:
   - CRUD operations for each entity
   - Aggregated queries using the views
   - CSV upload processing

6. **Data Validation**: Implement validation for:
   - Required fields (NOT NULL constraints)
   - Foreign key relationships
   - Data types and formats

---

## Generated Files

- `schema_him_ttdi.json` - Complete schema structure in JSON format
- `SCHEMA_DOCUMENTATION.md` - This documentation file

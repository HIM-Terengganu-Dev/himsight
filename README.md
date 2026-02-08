# HIMSight TTDI Dashboard

A Next.js dashboard application for HIM Wellness TTDI with a professional sidebar navigation.

## Features

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Sidebar Navigation** with collapsible menu groups
- **Professional Design** with dark sidebar and light content area

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── business-group/
│   │   ├── him-wellness/
│   │   ├── him-product/
│   │   └── him-clinic/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── DashboardLayout.tsx
│   └── Sidebar.tsx
├── public/
│   └── himsight-Photoroom.png
└── package.json
```

## Navigation Structure

- **Home** - Main dashboard (in development)
- **Business Group**
  - **HIM Wellness** - Wellness dashboard
  - **HIM Product** - Product dashboard
  - **HIM Clinic (Telehealth)** - Telehealth dashboard

## Environment Variables

Make sure to have `.env.local` with your database connection strings:
- `HIM_WELLNESS_TTDI_DB` - Read/Write connection
- `HIM_WELLNESS_TTDI_DB_DDL` - DDL connection

## Build for Production

```bash
npm run build
npm start
```

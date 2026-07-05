# Kirana Khata App

A hybrid-ready khata app MVP with:
- React frontend for web/mobile-friendly dashboards
- Node.js + Express backend
- PostgreSQL-ready data model
- Core khata workflows: registration, credit, debt, customer selection, admin dashboard, monthly/yearly analytics

## Quick start

1. Start PostgreSQL and create a database named `khataapp`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize tables:
   ```bash
   node backend/init-db.js
   ```
4. Start the app:
   ```bash
   npm run dev
   ```
5. Open:
   - Frontend: http://localhost:5173
   - Backend health check: http://localhost:4000/health

## MVP features included
- Dashboard summary for credit and debt
- Add khata entries with customer, phone, amount, type, date, and notes
- Customer list view
- Monthly analytics view

## Next enhancements
- Authentication for admin and employees
- Year-wise reports and export
- Mobile-optimized PWA support
- PostgreSQL schema for users and roles

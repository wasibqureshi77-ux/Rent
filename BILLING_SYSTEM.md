# Billing Logic & Dashboard System

## Overview
Complete billing system with automatic calculations, payment tracking, dashboard analytics, and monthly email summaries.

## 1. Bill Creation

### API Endpoint
`POST /api/bills`

### Request Body
```json
{
  "tenantId": "ObjectId",
  "propertyId": "ObjectId",
  "month": 12,
  "year": 2024,
  "startUnits": 100,
  "endUnits": 250
}
```

### Process Flow

1. **Validation**
   - Check required fields
   - Validate month (1-12)
   - Validate endUnits >= startUnits
   - Check for duplicate bill (unique per tenant/month/year)

2. **Fetch Data**
   - Get tenant details (baseRent, outstandingBalance)
   - Get owner settings (defaultWaterCharge, defaultRatePerUnit)

3. **Calculate Amounts**
   ```typescript
   unitsConsumed = endUnits - startUnits
   electricityAmount = unitsConsumed * ratePerUnit
   waterCharge = defaultWaterCharge
   rentAmount = tenant.baseRent
   previousDue = tenant.outstandingBalance
   totalAmount = rentAmount + electricityAmount + waterCharge + previousDue
   ```

4. **Initialize Payment**
   ```typescript
   amountPaid = 0
   remainingDue = totalAmount
   status = "PENDING"
   paymentHistory = []
   ```

5. **Create Bill**
   - Save to MonthlyBill collection
   - Return populated bill with tenant and property info

### Response
```json
{
  "_id": "...",
  "ownerId": "...",
  "propertyId": {...},
  "tenantId": {...},
  "month": 12,
  "year": 2024,
  "meter": {
    "startUnits": 100,
    "endUnits": 250,
    "unitsConsumed": 150
  },
  "amounts": {
    "ratePerUnit": 8,
    "waterCharge": 200,
    "rentAmount": 5000,
    "previousDue": 0,
    "electricityAmount": 1200,
    "totalAmount": 6400
  },
  "payments": {
    "amountPaid": 0,
    "remainingDue": 6400,
    "paymentHistory": []
  },
  "status": "PENDING"
}
```

## 2. Payment Recording

### API Endpoint
`POST /api/bills/:id/payments`

### Request Body
```json
{
  "amount": 3000,
  "mode": "UPI",
  "note": "Partial payment via PhonePe"
}
```

### Process Flow

1. **Validation**
   - Check amount > 0
   - Verify amount <= remainingDue
   - Verify bill ownership

2. **Add to Payment History**
   ```typescript
   paymentHistory.push({
     paidOn: new Date(),
     amount: 3000,
     mode: "UPI",
     note: "Partial payment via PhonePe"
   })
   ```

3. **Recalculate Totals**
   ```typescript
   amountPaid += amount
   remainingDue = totalAmount - amountPaid
   ```

4. **Update Status**
   ```typescript
   if (remainingDue === 0) {
     status = "PAID"
   } else if (amountPaid > 0) {
     status = "PARTIAL"
   }
   ```

5. **Update Tenant Balance**
   ```typescript
   tenant.outstandingBalance = remainingDue
   ```

### Response
```json
{
  "message": "Payment recorded successfully",
  "bill": {
    ...bill with updated payments
  }
}
```

## 3. Dashboard Summary

### API Endpoint
`GET /api/dashboard/summary?propertyId=...`

### Response
```json
{
  "summary": {
    "activeTenants": 15,
    "propertyCount": 2,
    "billsThisMonth": 12,
    "tenantsWithoutBills": 3,
    "totalOutstandingDue": 45000,
    "currentMonth": 12,
    "currentYear": 2024
  },
  "tenantsWithoutBills": [
    {
      "_id": "...",
      "fullName": "John Doe",
      "roomNumber": "101",
      "propertyId": "..."
    }
  ],
  "recentBills": [...],
  "paymentStats": [
    {
      "_id": "PAID",
      "count": 8,
      "totalAmount": 48000,
      "totalPaid": 48000
    },
    {
      "_id": "PARTIAL",
      "count": 3,
      "totalAmount": 18000,
      "totalPaid": 9000
    },
    {
      "_id": "PENDING",
      "count": 1,
      "totalAmount": 6000,
      "totalPaid": 0
    }
  ]
}
```

### Metrics Provided

1. **Active Tenants** - Count of active tenants
2. **Property Count** - Number of active properties
3. **Bills This Month** - Bills generated for current month
4. **Tenants Without Bills** - Active tenants missing bills
5. **Total Outstanding Due** - Sum of all unpaid amounts
6. **Recent Bills** - Last 5 bills created
7. **Payment Stats** - Breakdown by status

### Filtering
- By property: `?propertyId=...`
- Super admin can view all or filter by owner: `?ownerId=...`

## 4. Dashboard Alerts

### API Endpoint
`GET /api/dashboard/alerts?propertyId=...`

### Alert Types

#### 1. Missing Bills (Warning)
**Trigger:** After 25th of month
**Condition:** Active tenants without bills for current month

```json
{
  "type": "MISSING_BILLS",
  "severity": "warning",
  "title": "Missing Bills for Month-End",
  "message": "3 tenant(s) don't have bills generated for 12/2024",
  "count": 3,
  "data": [...]
}
```

#### 2. High Due Balance (Error)
**Trigger:** Any time
**Condition:** Bills with remainingDue >= ₹10,000

```json
{
  "type": "HIGH_DUE_BALANCE",
  "severity": "error",
  "title": "High Outstanding Balances",
  "message": "2 bill(s) with outstanding balance ≥ ₹10000",
  "count": 2,
  "data": [...]
}
```

#### 3. Overdue Bills (Error)
**Trigger:** Any time
**Condition:** Unpaid/partial bills from previous months

```json
{
  "type": "OVERDUE_BILLS",
  "severity": "error",
  "title": "Overdue Bills",
  "message": "5 overdue bill(s) with total outstanding of ₹25000.00",
  "count": 5,
  "totalAmount": 25000,
  "data": [...]
}
```

#### 4. High Tenant Balance (Warning)
**Trigger:** Any time
**Condition:** Tenants with outstandingBalance >= ₹5,000

```json
{
  "type": "HIGH_TENANT_BALANCE",
  "severity": "warning",
  "title": "Tenants with High Outstanding Balance",
  "message": "4 tenant(s) with outstanding balance ≥ ₹5000",
  "count": 4,
  "data": [...]
}
```

### Response Format
```json
{
  "alerts": [...],
  "summary": {
    "totalAlerts": 4,
    "criticalCount": 2,
    "warningCount": 2
  }
}
```

## 5. Monthly Email Summary

### Manual Trigger
`POST /api/billing/monthly-summary`

```json
{
  "month": 12,
  "year": 2024,
  "sendToAll": false
}
```

### Get Summary (No Email)
`GET /api/billing/monthly-summary?month=12&year=2024`

### Summary Content

```
================================================================================
MONTHLY BILLING SUMMARY - December 2024
================================================================================
To: owner@example.com
Owner: John Owner

SUMMARY:
  Total Active Tenants: 15
  Bills Generated: 12
  Tenants Without Bills: 3

FINANCIALS:
  Total Revenue: ₹72000.00
  Total Collected: ₹54000.00
  Total Outstanding: ₹18000.00

TENANTS WITHOUT BILLS:
  - Jane Doe (Room 101) - Building A
  - Bob Smith (Room 205) - Building B
  - Alice Johnson (Room 303) - Building A

OUTSTANDING DUES:
  - John Tenant (Room 102): ₹6000.00 [PENDING] - Building A
  - Mary Renter (Room 204): ₹4500.00 [PARTIAL] - Building B
  - Tom Resident (Room 301): ₹7500.00 [PENDING] - Building A

================================================================================
```

### Automated Cron Job

For production, set up a cron job to run monthly:

```javascript
// Example with node-cron
import cron from 'node-cron';
import { runMonthlyBillingForAllOwners } from '@/lib/billing-summary';

// Run on 1st of every month at 9 AM
cron.schedule('0 9 1 * *', async () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  await runMonthlyBillingForAllOwners(month, year);
});
```

### Super Admin Global Summary

`GET /api/billing/monthly-summary?month=12&year=2024&global=true`

Returns aggregated data for all owners:

```json
{
  "type": "global",
  "month": 12,
  "year": 2024,
  "owners": [
    {
      "ownerName": "John Owner",
      "ownerEmail": "john@example.com",
      "billCount": 12,
      "totalRevenue": 72000,
      "totalCollected": 54000,
      "totalOutstanding": 18000
    },
    ...
  ]
}
```

## 6. Access Control Rules

### Property Owner (PROPERTY_OWNER)
- Can only create bills for their own tenants
- Can only view their own bills
- Dashboard shows only their data
- Monthly summary includes only their properties

### Super Admin (SUPER_ADMIN)
- Can view all bills across all owners
- Can filter by owner or property
- Can trigger bulk monthly summaries
- Can view global summary

### Data Filtering
All queries automatically filter by `ownerId` unless user is SUPER_ADMIN:

```typescript
const query = session.user.role === 'SUPER_ADMIN' 
  ? {} 
  : { ownerId: session.user.id };
```

## 7. Bill Status Flow

```
PENDING
  ↓ (partial payment)
PARTIAL
  ↓ (full payment)
PAID
```

Status is automatically updated when payments are recorded.

## 8. Outstanding Balance Management

### When Bill is Created
```typescript
previousDue = tenant.outstandingBalance
totalAmount = rent + electricity + water + previousDue
```

### When Payment is Recorded
```typescript
tenant.outstandingBalance = bill.payments.remainingDue
```

This ensures the tenant's outstanding balance always reflects their current dues.

## 9. API Endpoints Summary

### Bills
- `GET /api/bills?propertyId=...&status=...&month=...&year=...` - List bills
- `POST /api/bills` - Create bill
- `GET /api/bills/:id` - Get single bill
- `PUT /api/bills/:id` - Update bill
- `POST /api/bills/:id/payments` - Record payment

### Dashboard
- `GET /api/dashboard/summary?propertyId=...` - Get summary
- `GET /api/dashboard/alerts?propertyId=...` - Get alerts

### Monthly Summary
- `GET /api/billing/monthly-summary?month=...&year=...` - Get summary
- `POST /api/billing/monthly-summary` - Generate and send
- `GET /api/billing/monthly-summary?global=true` - Global summary (admin)

## 10. Best Practices

### 1. Bill Generation
- Generate bills after 25th of each month
- Use previous month's end units as current month's start units
- Verify meter readings before creating bills

### 2. Payment Recording
- Always record payment mode for tracking
- Add notes for reference
- Verify amount before recording

### 3. Outstanding Balance
- Review high outstanding balances regularly
- Follow up on overdue bills
- Consider payment plans for large dues

### 4. Monthly Summary
- Review before month-end
- Follow up on missing bills
- Send reminders to tenants with dues

## 11. Testing Checklist

- [ ] Create bill with all calculations correct
- [ ] Verify duplicate bill prevention
- [ ] Record partial payment
- [ ] Record full payment
- [ ] Check status updates correctly
- [ ] Verify tenant balance updates
- [ ] Test dashboard summary
- [ ] Test all alert types
- [ ] Generate monthly summary
- [ ] Test property filtering
- [ ] Test super admin global view

## 12. Future Enhancements

1. **Automated Bill Generation**
   - Auto-generate bills on 1st of month
   - Use last month's end units as start units

2. **Payment Reminders**
   - SMS/Email reminders for due bills
   - Automated follow-ups

3. **Payment Gateway Integration**
   - Online payment collection
   - Automatic payment recording

4. **Advanced Analytics**
   - Revenue trends
   - Payment patterns
   - Tenant payment history

5. **Bulk Operations**
   - Bulk bill generation
   - Bulk payment recording

6. **PDF Generation**
   - Bill PDF download
   - Email bill to tenant

---

**Version:** 1.0.0  
**Last Updated:** 2025-12-09

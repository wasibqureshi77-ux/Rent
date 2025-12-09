# Multi-Property / Multi-Owner Data Structure

## Overview
This system supports multiple property owners, each managing one or more properties with their own tenants, bills, and settings.

## Data Models

### 1. Property Collection

Represents a physical property (PG building) owned by a user.

**Schema:**
```typescript
{
  _id: ObjectId,
  ownerId: ObjectId (ref: User),
  name: string,              // e.g., "Magpie PG – Building A"
  address?: string,
  city?: string,
  state?: string,
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ ownerId: 1, isActive: 1 }` - For efficient owner queries
- `{ ownerId: 1 }` - Single field index

**API Endpoints:**
- `GET /api/properties` - List all properties for logged-in owner
- `POST /api/properties` - Create new property
- `GET /api/properties/:id` - Get single property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### 2. Tenant Collection (Enhanced)

**Schema:**
```typescript
{
  _id: ObjectId,
  ownerId: ObjectId (ref: User),
  propertyId: ObjectId (ref: Property),
  fullName: string,
  roomNumber: string,
  phoneNumber: string,
  alternatePhoneNumber?: string,
  email?: string,
  baseRent: number,
  idProofs: [{
    type: string,
    fileUrl: string,
    fileName: string,
    uploadedAt: Date
  }],
  startDate: Date,
  endDate?: Date,
  isActive: boolean,
  outstandingBalance: number,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ ownerId: 1, propertyId: 1, isActive: 1 }` - Compound index for filtering
- `{ ownerId: 1, roomNumber: 1 }` - For room lookups

**API Endpoints:**
- `GET /api/tenants?propertyId=...` - List tenants (with optional property filter)
- `POST /api/tenants` - Create tenant
- `GET /api/tenants/:id` - Get single tenant
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant

### 3. MonthlyBill Collection (Enhanced)

**Schema:**
```typescript
{
  _id: ObjectId,
  ownerId: ObjectId (ref: User),
  propertyId: ObjectId (ref: Property),
  tenantId: ObjectId (ref: Tenant),
  month: number (1-12),
  year: number,
  
  meter: {
    startUnits: number,
    endUnits: number,
    unitsConsumed: number
  },
  
  amounts: {
    ratePerUnit: number,
    waterCharge: number,
    rentAmount: number,
    previousDue: number,
    electricityAmount: number,
    totalAmount: number
  },
  
  payments: {
    amountPaid: number,
    remainingDue: number,
    paymentHistory: [{
      paidOn: Date,
      amount: number,
      mode?: string,
      note?: string
    }]
  },
  
  status: "PENDING" | "PARTIAL" | "PAID",
  notes?: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Unique Constraint:**
- `{ tenantId: 1, month: 1, year: 1 }` - One bill per tenant per month/year

**Indexes:**
- `{ ownerId: 1, propertyId: 1, month: 1, year: 1 }` - For property-based queries
- `{ ownerId: 1, status: 1 }` - For status filtering

**API Endpoints:**
- `GET /api/bills?propertyId=...&status=...` - List bills
- `POST /api/bills` - Create bill
- `GET /api/bills/:id` - Get single bill
- `PUT /api/bills/:id` - Update bill
- `POST /api/bills/:id/payment` - Record payment

### 4. Settings Collection

Per-owner billing defaults and preferences.

**Schema:**
```typescript
{
  _id: ObjectId,
  ownerId: ObjectId (ref: User) [unique],
  defaultWaterCharge: number,
  defaultRatePerUnit: number,
  ownerEmail: string,
  currency: string,
  createdAt: Date,
  updatedAt: Date
}
```

**Unique Constraint:**
- `{ ownerId: 1 }` - One settings document per owner

**API Endpoints:**
- `GET /api/owner-settings` - Get owner's settings
- `PUT /api/owner-settings` - Update settings

## Access Control Rules

### Property Owner (PROPERTY_OWNER)
**Can access:**
- Only documents where `ownerId` matches their user ID
- All properties they own
- All tenants in their properties
- All bills for their tenants
- Their own settings

**Cannot access:**
- Other owners' data
- Admin functions

### Super Admin (SUPER_ADMIN)
**Can access:**
- All documents across all owners
- All properties
- All tenants
- All bills
- All settings
- Admin management functions

## Data Relationships

```
User (Owner)
  ├─ Properties (1:N)
  │   └─ Tenants (1:N)
  │       └─ MonthlyBills (1:N)
  └─ Settings (1:1)
```

## Query Patterns

### Get all tenants for a property
```typescript
const tenants = await Tenant.find({
  ownerId: session.user.id,
  propertyId: propertyId,
  isActive: true
});
```

### Get all bills for a property in a month
```typescript
const bills = await MonthlyBill.find({
  ownerId: session.user.id,
  propertyId: propertyId,
  month: 12,
  year: 2024
}).populate('tenantId', 'fullName roomNumber');
```

### Get outstanding bills across all properties
```typescript
const outstandingBills = await MonthlyBill.find({
  ownerId: session.user.id,
  status: { $in: ['PENDING', 'PARTIAL'] }
}).populate('propertyId', 'name')
  .populate('tenantId', 'fullName roomNumber');
```

## Migration from Old Structure

### For Existing Tenants
If you have existing tenants without `propertyId`:

1. **Create a default property:**
```typescript
const defaultProperty = await Property.create({
  ownerId: userId,
  name: "Default Property",
  isActive: true
});
```

2. **Update all tenants:**
```typescript
await Tenant.updateMany(
  { ownerId: userId, propertyId: { $exists: false } },
  { $set: { propertyId: defaultProperty._id } }
);
```

### For Existing Bills
```typescript
await MonthlyBill.updateMany(
  { ownerId: userId, propertyId: { $exists: false } },
  { $set: { propertyId: defaultProperty._id } }
);
```

## Best Practices

### 1. Always Include Owner ID
Every query for PROPERTY_OWNER should filter by `ownerId`:
```typescript
const query = session.user.role === 'SUPER_ADMIN' 
  ? {} 
  : { ownerId: session.user.id };
```

### 2. Validate Property Ownership
When creating tenants or bills, verify the property belongs to the owner:
```typescript
const property = await Property.findOne({
  _id: propertyId,
  ownerId: session.user.id
});

if (!property) {
  throw new Error('Property not found or access denied');
}
```

### 3. Use Population for Related Data
```typescript
const tenants = await Tenant.find(query)
  .populate('propertyId', 'name address')
  .sort({ createdAt: -1 });
```

### 4. Maintain Data Integrity
When deleting a property, handle related data:
```typescript
// Option 1: Prevent deletion if tenants exist
const tenantCount = await Tenant.countDocuments({ propertyId });
if (tenantCount > 0) {
  throw new Error('Cannot delete property with active tenants');
}

// Option 2: Soft delete
await Property.findByIdAndUpdate(id, { isActive: false });
```

## UI Considerations

### Property Selector
Add a property dropdown in forms:
```tsx
<select name="propertyId">
  {properties.map(p => (
    <option key={p._id} value={p._id}>{p.name}</option>
  ))}
</select>
```

### Dashboard Filtering
Allow filtering by property:
```tsx
const [selectedProperty, setSelectedProperty] = useState('all');

const filteredTenants = selectedProperty === 'all'
  ? tenants
  : tenants.filter(t => t.propertyId === selectedProperty);
```

### Property Management Page
Create `/dashboard/properties` for:
- Listing all properties
- Adding new properties
- Editing property details
- Viewing property statistics (tenant count, occupancy rate)

## API Response Examples

### GET /api/properties
```json
[
  {
    "_id": "...",
    "ownerId": "...",
    "name": "Magpie PG - Building A",
    "address": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### GET /api/tenants?propertyId=...
```json
[
  {
    "_id": "...",
    "ownerId": "...",
    "propertyId": {
      "_id": "...",
      "name": "Magpie PG - Building A"
    },
    "fullName": "John Doe",
    "roomNumber": "101",
    "phoneNumber": "9876543210",
    "email": "john@example.com",
    "baseRent": 5000,
    "isActive": true,
    "outstandingBalance": 0,
    "startDate": "2024-01-01T00:00:00.000Z"
  }
]
```

## File Structure

```
src/
├── models/
│   ├── User.ts
│   ├── Property.ts          # NEW
│   ├── Tenant.ts            # UPDATED
│   ├── MonthlyBill.ts       # NEW
│   └── Settings.ts          # NEW
└── app/
    └── api/
        ├── properties/
        │   ├── route.ts
        │   └── [id]/route.ts
        ├── tenants/
        │   ├── route.ts     # UPDATED
        │   └── [id]/route.ts
        ├── bills/
        │   ├── route.ts
        │   └── [id]/route.ts
        └── owner-settings/
            └── route.ts
```

## Testing Checklist

- [ ] Create multiple properties for one owner
- [ ] Create tenants in different properties
- [ ] Filter tenants by property
- [ ] Generate bills for tenants in specific property
- [ ] Verify PROPERTY_OWNER can only see their data
- [ ] Verify SUPER_ADMIN can see all data
- [ ] Test property deletion with/without tenants
- [ ] Update owner settings and verify defaults apply
- [ ] Test bill calculations with property-specific rates

## Future Enhancements

1. **Property Analytics**
   - Occupancy rate per property
   - Revenue per property
   - Tenant turnover rate

2. **Bulk Operations**
   - Bulk tenant import per property
   - Bulk bill generation per property

3. **Property Templates**
   - Save property configurations
   - Clone property settings

4. **Multi-Currency Support**
   - Per-property currency settings
   - Exchange rate management

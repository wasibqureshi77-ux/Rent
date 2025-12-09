# Database Migration Guide

## Overview
This guide helps migrate existing data to the new multi-property schema.

## Changes Required

### 1. Tenant Collection
**New Required Field:** `propertyId`

### 2. MonthlyBill Collection  
**New Required Fields:** `propertyId`, nested structure for meter/amounts/payments

### 3. New Collections
- **Property** - Must be created
- **Settings** - Per-owner settings

## Migration Steps

### Step 1: Create Default Property for Each Owner

```javascript
// Run this script to create default properties
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Property = require('./src/models/Property');

async function createDefaultProperties() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const owners = await User.find({ role: { $in: ['PROPERTY_OWNER', 'SUPER_ADMIN'] } });
  
  for (const owner of owners) {
    // Check if property already exists
    const existingProperty = await Property.findOne({ ownerId: owner._id });
    
    if (!existingProperty) {
      const property = await Property.create({
        ownerId: owner._id,
        name: `${owner.name}'s Property`,
        isActive: true
      });
      
      console.log(`Created default property for ${owner.name}: ${property._id}`);
    }
  }
  
  console.log('Default properties created!');
  await mongoose.disconnect();
}

createDefaultProperties();
```

### Step 2: Update Existing Tenants

```javascript
// Add propertyId to existing tenants
const Tenant = require('./src/models/Tenant');

async function migrateTenants() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const owners = await User.find({ role: { $in: ['PROPERTY_OWNER', 'SUPER_ADMIN'] } });
  
  for (const owner of owners) {
    // Get owner's default property
    const property = await Property.findOne({ ownerId: owner._id });
    
    if (property) {
      // Update all tenants without propertyId
      const result = await Tenant.updateMany(
        { 
          ownerId: owner._id,
          propertyId: { $exists: false }
        },
        { 
          $set: { propertyId: property._id }
        }
      );
      
      console.log(`Updated ${result.modifiedCount} tenants for ${owner.name}`);
    }
  }
  
  console.log('Tenant migration complete!');
  await mongoose.disconnect();
}

migrateTenants();
```

### Step 3: Update Existing Bills (If Any)

```javascript
// Migrate old bill structure to new nested structure
const MonthlyBill = require('./src/models/MonthlyBill');

async function migrateBills() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Get all bills
  const bills = await MonthlyBill.find({});
  
  for (const bill of bills) {
    // If bill doesn't have propertyId, get it from tenant
    if (!bill.propertyId) {
      const tenant = await Tenant.findById(bill.tenantId);
      if (tenant && tenant.propertyId) {
        bill.propertyId = tenant.propertyId;
      }
    }
    
    // Migrate flat structure to nested if needed
    if (!bill.meter || !bill.amounts || !bill.payments) {
      bill.meter = {
        startUnits: bill.startUnits || 0,
        endUnits: bill.endUnits || 0,
        unitsConsumed: bill.unitsConsumed || 0
      };
      
      bill.amounts = {
        ratePerUnit: bill.ratePerUnit || 0,
        waterCharge: bill.waterCharge || 0,
        rentAmount: bill.rentAmount || 0,
        previousDue: bill.previousDue || 0,
        electricityAmount: bill.electricityAmount || 0,
        totalAmount: bill.totalAmount || 0
      };
      
      bill.payments = {
        amountPaid: bill.amountPaid || 0,
        remainingDue: bill.remainingDue || 0,
        paymentHistory: bill.paymentHistory || []
      };
      
      await bill.save();
      console.log(`Migrated bill ${bill._id}`);
    }
  }
  
  console.log('Bill migration complete!');
  await mongoose.disconnect();
}

migrateBills();
```

### Step 4: Create Default Settings

```javascript
// Create default settings for each owner
const Settings = require('./src/models/Settings');

async function createDefaultSettings() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const owners = await User.find({ role: { $in: ['PROPERTY_OWNER', 'SUPER_ADMIN'] } });
  
  for (const owner of owners) {
    const existing = await Settings.findOne({ ownerId: owner._id });
    
    if (!existing) {
      await Settings.create({
        ownerId: owner._id,
        ownerEmail: owner.email,
        defaultWaterCharge: 0,
        defaultRatePerUnit: 0,
        currency: 'INR'
      });
      
      console.log(`Created settings for ${owner.name}`);
    }
  }
  
  console.log('Settings migration complete!');
  await mongoose.disconnect();
}

createDefaultSettings();
```

## Complete Migration Script

Save this as `migrate.js` in your project root:

```javascript
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Import models
const User = require('./src/models/User').default;
const Property = require('./src/models/Property').default;
const Tenant = require('./src/models/Tenant').default;
const MonthlyBill = require('./src/models/MonthlyBill').default;
const Settings = require('./src/models/Settings').default;

async function runMigration() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');
    
    // Step 1: Create properties
    console.log('\n=== Step 1: Creating Properties ===');
    const owners = await User.find({ 
      role: { $in: ['PROPERTY_OWNER', 'SUPER_ADMIN'] } 
    });
    
    for (const owner of owners) {
      let property = await Property.findOne({ ownerId: owner._id });
      
      if (!property) {
        property = await Property.create({
          ownerId: owner._id,
          name: `${owner.name}'s Property`,
          isActive: true
        });
        console.log(`✓ Created property for ${owner.name}`);
      } else {
        console.log(`- Property already exists for ${owner.name}`);
      }
    }
    
    // Step 2: Update tenants
    console.log('\n=== Step 2: Updating Tenants ===');
    for (const owner of owners) {
      const property = await Property.findOne({ ownerId: owner._id });
      
      if (property) {
        const result = await Tenant.updateMany(
          { 
            ownerId: owner._id,
            propertyId: { $exists: false }
          },
          { 
            $set: { propertyId: property._id }
          }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`✓ Updated ${result.modifiedCount} tenants for ${owner.name}`);
        }
      }
    }
    
    // Step 3: Create settings
    console.log('\n=== Step 3: Creating Settings ===');
    for (const owner of owners) {
      const existing = await Settings.findOne({ ownerId: owner._id });
      
      if (!existing) {
        await Settings.create({
          ownerId: owner._id,
          ownerEmail: owner.email,
          defaultWaterCharge: 0,
          defaultRatePerUnit: 0,
          currency: 'INR'
        });
        console.log(`✓ Created settings for ${owner.name}`);
      } else {
        console.log(`- Settings already exist for ${owner.name}`);
      }
    }
    
    console.log('\n=== Migration Complete! ===');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runMigration();
```

## Running the Migration

```bash
node migrate.js
```

## Verification

After migration, verify:

```javascript
// Check all tenants have propertyId
db.tenants.find({ propertyId: { $exists: false } }).count()
// Should return 0

// Check all owners have properties
db.properties.find().count()
// Should match number of owners

// Check all owners have settings
db.settings.find().count()
// Should match number of owners
```

## Rollback (If Needed)

```javascript
// Remove propertyId from tenants
db.tenants.updateMany({}, { $unset: { propertyId: "" } })

// Delete all properties
db.properties.deleteMany({})

// Delete all settings
db.settings.deleteMany({})
```

## Notes

- **Backup First:** Always backup your database before migration
- **Test Environment:** Run migration in test environment first
- **Incremental:** Can run migration multiple times safely (idempotent)
- **Validation:** Check data after each step

## Troubleshooting

### Issue: "Cannot populate path `propertyId`"
**Solution:** Restart dev server after model changes

### Issue: Tenants still missing propertyId
**Solution:** Run Step 2 of migration again

### Issue: Bills not working
**Solution:** Ensure all tenants have valid propertyId first

---

**Last Updated:** 2025-12-09

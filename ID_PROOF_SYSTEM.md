# ID Proof Upload & Meter Reading Features

## Overview
Enhanced tenant management with ID proof upload functionality and meter reading tracking.

## New Features

### 1. Meter Reading Start Field

**Purpose:** Track the initial meter reading when a tenant moves in.

**Model Update:**
```typescript
{
  meterReadingStart: number (default: 0)
}
```

**Usage:**
- Set during tenant creation
- Used as baseline for first bill calculation
- Helps track total electricity consumption over tenancy

**API:**
```json
POST /api/tenants
{
  "meterReadingStart": 1500
}
```

### 2. ID Proof Upload System

**Features:**
- Upload multiple ID proofs per tenant
- Support for images and PDFs
- Document type categorization
- Manual or auto-extracted document numbers
- File preview before upload
- View and delete uploaded proofs

**Supported Document Types:**
- Aadhaar Card
- PAN Card
- Passport
- Driving License
- Voter ID
- Other

**Model Update:**
```typescript
idProofs: [{
  type: string,
  fileUrl: string,
  fileName: string,
  documentNumber?: string,  // NEW
  uploadedAt: Date
}]
```

## API Endpoints

### Upload ID Proof
`POST /api/tenants/:id/upload-id`

**Request:**
- Content-Type: multipart/form-data
- Fields:
  - `file`: Image or PDF file
  - `type`: Document type (required)
  - `documentNumber`: Manual document number (optional)

**Response:**
```json
{
  "message": "ID proof uploaded successfully",
  "idProof": {
    "type": "Aadhaar",
    "fileUrl": "/uploads/id-proofs/tenant_123_1234567890.jpg",
    "fileName": "aadhaar.jpg",
    "documentNumber": "123456789012",
    "uploadedAt": "2024-12-09T..."
  }
}
```

### Get ID Proofs
`GET /api/tenants/:id/upload-id`

**Response:**
```json
{
  "idProofs": [...]
}
```

### Delete ID Proof
`DELETE /api/tenants/:id/upload-id?proofIndex=0`

**Response:**
```json
{
  "message": "ID proof deleted successfully"
}
```

## OCR Document Number Extraction

### Pattern Matching

The system includes pattern matching for common Indian documents:

**Aadhaar:**
- Pattern: 12 digits (XXXX XXXX XXXX)
- Regex: `/\b\d{4}\s?\d{4}\s?\d{4}\b/g`

**PAN:**
- Pattern: 5 letters + 4 digits + 1 letter
- Regex: `/\b[A-Z]{5}\d{4}[A-Z]\b/g`
- Example: ABCDE1234F

**Passport:**
- Pattern: 1 letter + 7-8 digits
- Regex: `/\b[A-Z]\d{7,8}\b/g`
- Example: A1234567

### Usage

```typescript
import { extractDocumentNumberByType } from '@/lib/ocr';

const text = "Aadhaar: 1234 5678 9012";
const number = extractDocumentNumberByType(text, 'Aadhaar');
// Returns: "123456789012"
```

### Future Enhancement: Full OCR

For production, integrate Tesseract.js for full OCR:

```bash
npm install tesseract.js
```

```typescript
import { createWorker } from 'tesseract.js';

async function extractTextFromImage(imageBuffer: Buffer) {
  const worker = await createWorker();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  const { data: { text } } = await worker.recognize(imageBuffer);
  await worker.terminate();
  return text;
}
```

## React Component

### IdProofUpload Component

**Location:** `src/components/tenants/IdProofUpload.tsx`

**Props:**
```typescript
{
  tenantId: string,
  existingProofs?: IdProof[],
  onUploadComplete?: () => void
}
```

**Features:**
- File selection with drag & drop support
- Image preview before upload
- Document type dropdown
- Manual document number input
- Upload progress indicator
- List of uploaded proofs
- View and delete actions

**Usage:**
```tsx
import IdProofUpload from '@/components/tenants/IdProofUpload';

<IdProofUpload 
  tenantId={tenant._id}
  existingProofs={tenant.idProofs}
  onUploadComplete={() => {
    // Refresh tenant data
  }}
/>
```

## File Storage

### Directory Structure
```
public/
  uploads/
    id-proofs/
      {tenantId}_{timestamp}.{ext}
```

### File Naming
- Format: `{tenantId}_{timestamp}.{extension}`
- Example: `507f1f77bcf86cd799439011_1702123456789.jpg`

### Access
- Files are publicly accessible via `/uploads/id-proofs/{filename}`
- Served by Next.js static file serving

### Security Considerations

**Current Implementation:**
- Files stored in public directory
- Accessible via direct URL

**Production Recommendations:**
1. **Private Storage:**
   - Use cloud storage (AWS S3, Google Cloud Storage)
   - Generate signed URLs for access
   - Set expiration on URLs

2. **Access Control:**
   - Verify user ownership before serving files
   - Create API endpoint for file access
   - Log file access attempts

3. **File Validation:**
   - Validate file types (images, PDFs only)
   - Scan for malware
   - Limit file sizes (e.g., 5MB max)

## Integration Example

### Tenant Edit Page

```tsx
'use client';

import { useState, useEffect } from 'react';
import IdProofUpload from '@/components/tenants/IdProofUpload';

export default function EditTenantPage({ params }: { params: { id: string } }) {
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    fetchTenant();
  }, []);

  const fetchTenant = async () => {
    const res = await fetch(`/api/tenants/${params.id}`);
    const data = await res.json();
    setTenant(data);
  };

  return (
    <div>
      {/* Tenant form fields */}
      
      {/* ID Proof Upload Section */}
      <IdProofUpload 
        tenantId={params.id}
        existingProofs={tenant?.idProofs}
        onUploadComplete={fetchTenant}
      />
    </div>
  );
}
```

## Meter Reading Workflow

### 1. Tenant Creation
```json
POST /api/tenants
{
  "meterReadingStart": 1500,
  ...other fields
}
```

### 2. First Bill Creation
```json
POST /api/bills
{
  "tenantId": "...",
  "startUnits": 1500,  // Use meterReadingStart
  "endUnits": 1650,
  ...
}
```

### 3. Subsequent Bills
```json
POST /api/bills
{
  "tenantId": "...",
  "startUnits": 1650,  // Previous bill's endUnits
  "endUnits": 1800,
  ...
}
```

## Testing Checklist

- [ ] Upload Aadhaar card image
- [ ] Upload PAN card image
- [ ] Upload PDF document
- [ ] Verify file preview works
- [ ] Test manual document number entry
- [ ] Test document number pattern extraction
- [ ] View uploaded proof
- [ ] Delete uploaded proof
- [ ] Create tenant with meterReadingStart
- [ ] Generate bill using meterReadingStart
- [ ] Verify file storage in public/uploads
- [ ] Test access control (owner can't access other's files)

## Migration

### Add meterReadingStart to Existing Tenants

```javascript
db.tenants.updateMany(
  { meterReadingStart: { $exists: false } },
  { $set: { meterReadingStart: 0 } }
);
```

### Create Uploads Directory

```bash
mkdir -p public/uploads/id-proofs
```

## Future Enhancements

1. **Full OCR Integration**
   - Tesseract.js for text extraction
   - Automatic document number detection
   - Multi-language support

2. **Cloud Storage**
   - AWS S3 integration
   - Cloudinary for image optimization
   - CDN for faster delivery

3. **Advanced Features**
   - Document verification API integration
   - Face matching with tenant photo
   - Expiry date tracking
   - Renewal reminders

4. **Bulk Upload**
   - Upload multiple documents at once
   - Batch processing
   - Progress tracking

5. **Mobile App**
   - Camera integration
   - Real-time OCR
   - Document scanning

---

**Version:** 1.0.0  
**Last Updated:** 2025-12-09

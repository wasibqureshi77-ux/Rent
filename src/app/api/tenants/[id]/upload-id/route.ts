import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Tenant from '@/models/Tenant';
import path from 'path';
import { extractDocumentNumberByType } from '@/lib/ocr';

// POST /api/tenants/:id/upload-id - Upload ID proof for tenant
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const { id } = await params;

        // Get form data
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const docType = formData.get('type') as string;
        const manualDocNumber = formData.get('documentNumber') as string;

        if (!file) {
            return NextResponse.json({
                message: 'No file uploaded'
            }, { status: 400 });
        }

        if (!docType) {
            return NextResponse.json({
                message: 'Document type is required'
            }, { status: 400 });
        }

        // Verify tenant ownership
        const query: any = { _id: id };
        if (session.user.role !== 'SUPER_ADMIN') {
            query.ownerId = session.user.id;
        }

        const tenant = await Tenant.findOne(query);

        if (!tenant) {
            return NextResponse.json({
                message: 'Tenant not found or access denied'
            }, { status: 404 });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileName = `${tenant._id}_${timestamp}.${fileExtension}`;

        // Save file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Cloudinary
        let fileUrl: string;
        try {
            // Dynamic import to avoid issues if utils not present, though we created it.
            const { uploadToCloudinary } = await import('@/lib/cloudinary');
            const result = await uploadToCloudinary(buffer, 'id-proofs', fileName);
            fileUrl = result.url;
        } catch (uploadError: any) {
            console.error('Cloudinary upload error:', uploadError);
            return NextResponse.json({
                message: 'Error uploading file to cloud storage'
            }, { status: 500 });
        }

        // Try to extract document number from image
        // For now, we'll use manual input or pattern matching on filename
        let documentNumber = manualDocNumber || null;

        // TODO: Implement OCR extraction
        // const extractedText = await extractTextFromImage(buffer);
        // documentNumber = extractDocumentNumberByType(extractedText, docType);

        // Add ID proof to tenant
        tenant.idProofs.push({
            type: docType,
            fileUrl,
            fileName: file.name,
            documentNumber,
            uploadedAt: new Date()
        });

        await tenant.save();

        return NextResponse.json({
            message: 'ID proof uploaded successfully',
            idProof: {
                type: docType,
                fileUrl,
                fileName: file.name,
                documentNumber,
                uploadedAt: new Date()
            }
        }, { status: 201 });
    } catch (error: any) {
        console.error('Error uploading ID proof:', error);
        return NextResponse.json({
            message: error.message || 'Error uploading ID proof'
        }, { status: 500 });
    }
}

// GET /api/tenants/:id/upload-id - Get all ID proofs for tenant
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const { id } = await params;

        const query: any = { _id: id };
        if (session.user.role !== 'SUPER_ADMIN') {
            query.ownerId = session.user.id;
        }

        const tenant = await Tenant.findOne(query).select('idProofs');

        if (!tenant) {
            return NextResponse.json({
                message: 'Tenant not found or access denied'
            }, { status: 404 });
        }

        return NextResponse.json({
            idProofs: tenant.idProofs || []
        });
    } catch (error) {
        console.error('Error fetching ID proofs:', error);
        return NextResponse.json({
            message: 'Error fetching ID proofs'
        }, { status: 500 });
    }
}

// DELETE /api/tenants/:id/upload-id?proofIndex=0 - Delete an ID proof
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const proofIndex = parseInt(searchParams.get('proofIndex') || '0');

        const query: any = { _id: id };
        if (session.user.role !== 'SUPER_ADMIN') {
            query.ownerId = session.user.id;
        }

        const tenant = await Tenant.findOne(query);

        if (!tenant) {
            return NextResponse.json({
                message: 'Tenant not found or access denied'
            }, { status: 404 });
        }

        if (proofIndex < 0 || proofIndex >= tenant.idProofs.length) {
            return NextResponse.json({
                message: 'Invalid proof index'
            }, { status: 400 });
        }

        // Remove the ID proof
        tenant.idProofs.splice(proofIndex, 1);
        await tenant.save();

        return NextResponse.json({
            message: 'ID proof deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting ID proof:', error);
        return NextResponse.json({
            message: 'Error deleting ID proof'
        }, { status: 500 });
    }
}

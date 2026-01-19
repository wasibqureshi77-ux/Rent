import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import path from 'path';
import crypto from 'crypto';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
        }

        let buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${crypto.randomUUID()}${path.extname(file.name)}`;
        // Note: keeping extension as original if not processing, or png if processed.

        // Log info
        console.log(`Processing upload for ${file.name}, size: ${buffer.length}`);

        let processed = false;
        try {
            // Dynamic imports to prevent load-time crashes if binaries missing
            const sharp = (await import('sharp')).default;
            const jsQR = (await import('jsqr')).default;

            const image = sharp(buffer);
            const metadata = await image.metadata();

            if (metadata.width && metadata.height) {
                const { data, info } = await image
                    .ensureAlpha()
                    .raw()
                    .toBuffer({ resolveWithObject: true });

                const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);

                if (code) {
                    const loc = code.location;
                    const padding = 20;

                    const minX = Math.min(loc.topLeftCorner.x, loc.topRightCorner.x, loc.bottomLeftCorner.x, loc.bottomRightCorner.x);
                    const maxX = Math.max(loc.topLeftCorner.x, loc.topRightCorner.x, loc.bottomLeftCorner.x, loc.bottomRightCorner.x);
                    const minY = Math.min(loc.topLeftCorner.y, loc.topRightCorner.y, loc.bottomLeftCorner.y, loc.bottomRightCorner.y);
                    const maxY = Math.max(loc.topLeftCorner.y, loc.topRightCorner.y, loc.bottomLeftCorner.y, loc.bottomRightCorner.y);

                    let left = Math.floor(minX - padding);
                    let top = Math.floor(minY - padding);
                    let width = Math.ceil(maxX - minX + (padding * 2));
                    let height = Math.ceil(maxY - minY + (padding * 2));

                    // Use metadata to bound check more safely
                    if (left < 0) left = 0;
                    if (top < 0) top = 0;
                    if (left + width > info.width) width = info.width - left;
                    if (top + height > info.height) height = info.height - top;

                    console.log('QR Code detected. Cropping...', { left, top, width, height });

                    buffer = await (sharp(buffer)
                        .extract({ left, top, width, height })
                        .toFormat('png')
                        .toBuffer() as any);

                    // Update filename to png
                    processed = true;
                } else {
                    console.log('No QR code detected by jsQR');
                }
            }
        } catch (procErr) {
            console.error('QR Processing failed (continuing with original):', procErr);
        }

        // Upload to Cloudinary
        let fileUrl: string;
        try {
            const { uploadToCloudinary } = await import('@/lib/cloudinary');
            // If processed, use 'png' extension or just rely on Cloudinary auto-format 
            // We use the filename (without path) as public_id logic in helper
            const finalFilename = processed ? filename.replace(/\.[^/.]+$/, ".png") : filename;

            const result = await uploadToCloudinary(buffer, 'qr-codes', finalFilename);
            fileUrl = result.url;
            console.log('File uploaded to Cloudinary:', fileUrl);
        } catch (uploadError: any) {
            console.error('Cloudinary upload failed:', uploadError);
            // Fallback? No, we can't save locally on Vercel. 
            // Return error if Cloudinary fails, or maybe we check if we have CREDENTIALS.
            // If no credentials, we might fail hard or try local (if dev).
            // But user asked to fix for server deployment.
            return NextResponse.json({ message: 'Error uploading to cloud storage: ' + uploadError.message }, { status: 500 });
        }

        return NextResponse.json({ url: fileUrl, detected: processed });
    } catch (error: any) {
        console.error('Upload handler error:', error);
        return NextResponse.json({ message: 'Error uploading file: ' + error.message }, { status: 500 });
    }
}

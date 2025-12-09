import { createWorker } from 'tesseract.js';

/**
 * Extract text from image using Tesseract OCR
 */
export async function extractTextFromImage(imageFile: File): Promise<string> {
    try {
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(imageFile);
        await worker.terminate();
        return text;
    } catch (error) {
        console.error('OCR extraction error:', error);
        throw error;
    }
}

/**
 * Extract Aadhaar number pattern from text
 */
export function extractAadhaarNumber(text: string): string | null {
    // Match 12 digits with optional spaces
    const aadhaarPattern = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
    const matches = text.match(aadhaarPattern);
    return matches ? matches[0].replace(/\s/g, '') : null;
}

/**
 * Extract PAN number pattern from text
 */
export function extractPANNumber(text: string): string | null {
    // Match PAN format: 5 letters, 4 digits, 1 letter
    const panPattern = /\b[A-Z]{5}\d{4}[A-Z]\b/g;
    const matches = text.match(panPattern);
    return matches ? matches[0] : null;
}

/**
 * Extract Passport number pattern from text
 */
export function extractPassportNumber(text: string): string | null {
    // Match passport format: 1 letter followed by 7-8 digits
    const passportPattern = /\b[A-Z]\d{7,8}\b/g;
    const matches = text.match(passportPattern);
    return matches ? matches[0] : null;
}

/**
 * Extract Driving License number pattern from text
 */
export function extractDrivingLicenseNumber(text: string): string | null {
    // Match DL format: State code (2 letters) + RTO code (2 digits) + Year (4 digits) + Serial (7 digits)
    // Example: MH01 20190012345
    const dlPattern = /\b[A-Z]{2}\d{2}\s?\d{4}\s?\d{7}\b/g;
    const matches = text.match(dlPattern);
    return matches ? matches[0].replace(/\s/g, '') : null;
}

/**
 * Extract Voter ID number pattern from text
 */
export function extractVoterIdNumber(text: string): string | null {
    // Match Voter ID format: 3 letters + 7 digits
    // Example: ABC1234567
    const voterIdPattern = /\b[A-Z]{3}\d{7}\b/g;
    const matches = text.match(voterIdPattern);
    return matches ? matches[0] : null;
}

/**
 * Extract any document number based on document type
 */
export function extractDocumentNumberByType(text: string, docType: string): string | null {
    const upperText = text.toUpperCase();

    switch (docType.toLowerCase()) {
        case 'aadhaar':
        case 'aadhar':
            return extractAadhaarNumber(upperText);
        case 'pan':
        case 'pan card':
            return extractPANNumber(upperText);
        case 'passport':
            return extractPassportNumber(upperText);
        case 'driving license':
        case 'dl':
            return extractDrivingLicenseNumber(upperText);
        case 'voter id':
        case 'epic':
            return extractVoterIdNumber(upperText);
        default:
            // Try all patterns
            return extractAadhaarNumber(upperText) ||
                extractPANNumber(upperText) ||
                extractPassportNumber(upperText) ||
                extractDrivingLicenseNumber(upperText) ||
                extractVoterIdNumber(upperText);
    }
}

/**
 * Extract document number from image file
 */
export async function extractDocumentNumberFromImage(
    imageFile: File,
    docType: string
): Promise<string | null> {
    try {
        const text = await extractTextFromImage(imageFile);
        return extractDocumentNumberByType(text, docType);
    } catch (error) {
        console.error('Failed to extract document number:', error);
        return null;
    }
}

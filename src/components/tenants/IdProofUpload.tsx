'use client';

import { useState } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';

interface IdProof {
    type: string;
    fileUrl: string;
    fileName: string;
    documentNumber?: string;
    uploadedAt: Date;
}

interface IdProofUploadProps {
    tenantId: string;
    existingProofs?: IdProof[];
    onUploadComplete?: () => void;
}

export default function IdProofUpload({ tenantId, existingProofs = [], onUploadComplete }: IdProofUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [docType, setDocType] = useState('');
    const [documentNumber, setDocumentNumber] = useState('');
    const [extracting, setExtracting] = useState(false);
    const [proofs, setProofs] = useState<IdProof[]>(existingProofs);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            // Auto-extract document number if docType is selected and it's an image
            if (docType && file.type.startsWith('image/')) {
                setExtracting(true);
                setDocumentNumber('Extracting...');
                try {
                    const { extractDocumentNumberFromImage } = await import('@/lib/ocr');
                    const extracted = await extractDocumentNumberFromImage(file, docType);
                    if (extracted) {
                        setDocumentNumber(extracted);
                    } else {
                        setDocumentNumber('');
                    }
                } catch (error) {
                    console.error('OCR extraction failed:', error);
                    setDocumentNumber('');
                } finally {
                    setExtracting(false);
                }
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !docType) {
            alert('Please select a file and document type');
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('type', docType);
            if (documentNumber && documentNumber !== 'Extracting...') {
                formData.append('documentNumber', documentNumber);
            }

            const res = await fetch(`/api/tenants/${tenantId}/upload-id`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Upload failed');
            }

            // Add to proofs list
            setProofs([...proofs, data.idProof]);

            // Reset form
            setSelectedFile(null);
            setPreview(null);
            setDocType('');
            setDocumentNumber('');

            if (onUploadComplete) {
                onUploadComplete();
            }

            alert('ID proof uploaded successfully!');
        } catch (error: any) {
            console.error('Upload error:', error);
            alert(error.message || 'Failed to upload ID proof');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (index: number) => {
        if (!confirm('Are you sure you want to delete this ID proof?')) {
            return;
        }

        try {
            const res = await fetch(`/api/tenants/${tenantId}/upload-id?proofIndex=${index}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                throw new Error('Failed to delete ID proof');
            }

            // Remove from list
            const newProofs = [...proofs];
            newProofs.splice(index, 1);
            setProofs(newProofs);

            alert('ID proof deleted successfully!');
        } catch (error: any) {
            console.error('Delete error:', error);
            alert(error.message || 'Failed to delete ID proof');
        }
    };

    return (
        <div className="space-y-6">
            {/* Upload Section */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Upload ID Proof
                </h3>

                <div className="space-y-4">
                    {/* Document Type */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Document Type *
                        </label>
                        <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                            className="w-full p-3 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                            <option value="">Select document type</option>
                            <option value="Aadhaar">Aadhaar Card</option>
                            <option value="PAN">PAN Card</option>
                            <option value="Passport">Passport</option>
                            <option value="Driving License">Driving License</option>
                            <option value="Voter ID">Voter ID</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Document Number (Optional) */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Document Number {extracting && <span className="text-primary">(Extracting...)</span>}
                        </label>
                        <input
                            type="text"
                            value={documentNumber}
                            onChange={(e) => setDocumentNumber(e.target.value)}
                            placeholder="Auto-extracted or enter manually"
                            disabled={extracting}
                            className="w-full p-3 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder:text-gray-400 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Will auto-extract from image using OCR
                        </p>
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Upload File *
                        </label>
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="id-proof-upload"
                            />
                            <label
                                htmlFor="id-proof-upload"
                                className="flex items-center justify-center gap-2 w-full p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <Upload className="h-6 w-6 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">
                                    {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Preview */}
                    {preview && (
                        <div className="relative">
                            <img
                                src={preview}
                                alt="Preview"
                                className="w-full max-h-64 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
                            />
                            <button
                                onClick={() => {
                                    setSelectedFile(null);
                                    setPreview(null);
                                    setDocumentNumber('');
                                }}
                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Upload Button */}
                    <button
                        onClick={handleUpload}
                        disabled={uploading || extracting || !selectedFile || !docType}
                        className="w-full py-3 px-4 bg-primary hover:bg-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Uploading...
                            </>
                        ) : extracting ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Extracting...
                            </>
                        ) : (
                            <>
                                <Upload className="h-5 w-5" />
                                Upload ID Proof
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Existing Proofs */}
            {proofs.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                        Uploaded ID Proofs
                    </h3>

                    <div className="space-y-3">
                        {proofs.map((proof, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                                <div className="flex items-center gap-3">
                                    <FileText className="h-8 w-8 text-primary" />
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {proof.type}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {proof.fileName}
                                        </p>
                                        {proof.documentNumber && (
                                            <p className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                                                {proof.documentNumber}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={proof.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                    >
                                        View
                                    </a>
                                    <button
                                        onClick={() => handleDelete(index)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

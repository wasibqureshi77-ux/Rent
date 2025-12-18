'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Save } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function SettingsPage() {
    const { register, handleSubmit, setValue, watch, getValues } = useForm();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const upiQrCode = watch('upiQrCode');

    useEffect(() => {
        // Fetch property owner settings
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                setValue('fixedWaterBill', data.fixedWaterBill);
                setValue('electricityRatePerUnit', data.electricityRatePerUnit);
                setValue('currency', data.currency || 'INR');
                setValue('upiQrCode', data.upiQrCode);
            });
    }, [setValue]);

    const onSubmit = async (data: any) => {
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update');

            setMessage('Settings saved successfully!');
        } catch (err) {
            setMessage('Error saving settings.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Settings</h1>

            <div className="bg-white dark:bg-card p-8 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <h2 className="text-lg font-semibold mb-6">Billing Configuration</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-1">Fixed Water Bill (per month)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                                <input
                                    type="number"
                                    {...register('fixedWaterBill')}
                                    className="w-full pl-8 p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">This amount will be added to every tenant's monthly bill.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Electricity Rate (per unit)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-500">₹</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('electricityRatePerUnit')}
                                    className="w-full pl-8 p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Used to calculate electricity charges based on meter readings.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Currency</label>
                            <input
                                type="text"
                                {...register('currency')}
                                className="w-full p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
                                placeholder="INR"
                            />
                        </div>

                        <div className="md:col-span-2 border-t border-gray-100 dark:border-gray-800 pt-6 mt-2">
                            <label className="block text-sm font-medium mb-3">UPI Payment QR Code</label>
                            <div className="flex items-center gap-6">
                                <div className="w-32 h-32 bg-gray-50 dark:bg-zinc-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-center overflow-hidden relative group">
                                    {upiQrCode ? (
                                        <img src={upiQrCode} alt="UPI QR Code Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-gray-400 text-xs text-center p-2">No QR Code uploaded</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-500 mb-2">Upload your UPI QR code so tenants can scan and pay directly.</p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            const formData = new FormData();
                                            formData.append('file', file);

                                            try {
                                                const res = await fetch('/api/settings/upload-qr', {
                                                    method: 'POST',
                                                    body: formData
                                                });

                                                if (res.ok) {
                                                    const data = await res.json();
                                                    setValue('upiQrCode', data.url, { shouldDirty: true });

                                                    // Auto-save settings after upload
                                                    await onSubmit({ ...getValues(), upiQrCode: data.url });
                                                } else {
                                                    const errorData = await res.json();
                                                    console.error('Upload failed:', errorData.message);
                                                    alert(`Upload failed: ${errorData.message}`);
                                                }
                                            } catch (err) {
                                                console.error('Upload error:', err);
                                                alert('Upload failed due to network or server error.');
                                            }
                                        }}
                                        className="block w-full text-sm text-gray-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-full file:border-0
                                            file:text-xs file:font-semibold
                                            file:bg-primary file:text-white
                                            hover:file:bg-orange-600
                                        "
                                    />
                                    <input type="hidden" {...register('upiQrCode')} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-md text-sm text-center ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-all disabled:opacity-50"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
}

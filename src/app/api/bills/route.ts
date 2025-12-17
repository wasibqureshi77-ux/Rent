import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import MonthlyBill from '@/models/MonthlyBill';
import Tenant from '@/models/Tenant';
import Settings from '@/models/Settings';

// GET /api/bills - List bills with optional filters
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const { searchParams } = new URL(req.url);
        const propertyId = searchParams.get('propertyId');
        const status = searchParams.get('status');
        const month = searchParams.get('month');
        const year = searchParams.get('year');

        const query: any = session.user.role === 'SUPER_ADMIN'
            ? {}
            : { ownerId: session.user.id };

        if (propertyId) query.propertyId = propertyId;
        if (status) query.status = status;
        if (month) query.month = parseInt(month);
        if (year) query.year = parseInt(year);

        const bills = await MonthlyBill.find(query)
            .populate('tenantId', 'fullName roomNumber')
            .populate('propertyId', 'name')
            .sort({ year: -1, month: -1, createdAt: -1 });

        return NextResponse.json(bills);
    } catch (error) {
        console.error('Error fetching bills:', error);
        return NextResponse.json({
            message: 'Error fetching bills'
        }, { status: 500 });
    }
}

// POST /api/bills - Create a new bill
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const body = await req.json();
        const { tenantId, propertyId, month, year, startUnits, endUnits } = body;

        // Validate required fields
        if (!tenantId || !propertyId || !month || !year || startUnits === undefined || endUnits === undefined) {
            return NextResponse.json({
                message: 'Missing required fields'
            }, { status: 400 });
        }

        // Validate month and year
        if (month < 1 || month > 12) {
            return NextResponse.json({
                message: 'Invalid month. Must be between 1 and 12'
            }, { status: 400 });
        }

        if (endUnits < startUnits) {
            return NextResponse.json({
                message: 'End units cannot be less than start units'
            }, { status: 400 });
        }

        // Check if bill already exists check removed to allow multiple bills


        // Fetch tenant
        const tenant = await Tenant.findOne({
            _id: tenantId,
            ownerId: session.user.role === 'SUPER_ADMIN' ? undefined : session.user.id
        });

        if (!tenant) {
            return NextResponse.json({
                message: 'Tenant not found or access denied'
            }, { status: 404 });
        }

        // Fetch owner settings
        let settings = await Settings.findOne({ ownerId: session.user.id });
        if (!settings) {
            // Create default settings if not exist
            settings = await Settings.create({
                ownerId: session.user.id,
                ownerEmail: session.user.email || '',
                defaultWaterCharge: 0,
                defaultRatePerUnit: 0,
                currency: 'INR'
            });
        }

        // Calculate bill amounts
        const unitsConsumed = endUnits - startUnits;
        const electricityAmount = unitsConsumed * settings.defaultRatePerUnit;

        // Allow overrides from frontend (for pro-rata rent or custom water charge)
        const waterCharge = body.waterCharge !== undefined ? Number(body.waterCharge) : settings.defaultWaterCharge;
        const rentAmount = body.rentAmount !== undefined ? Number(body.rentAmount) : tenant.baseRent;

        // Calculate previous dues from MonthlyBill history (Source of Truth)
        const previousBills = await MonthlyBill.find({
            tenantId,
            status: { $in: ['PENDING', 'PARTIAL'] }
        });

        const previousDue = previousBills.reduce((acc: number, b: any) => {
            return acc + (b.payments?.remainingDue || 0);
        }, 0);

        const totalAmount = rentAmount + electricityAmount + waterCharge + previousDue;

        // Initial Payment Logic
        const collectedAmount = body.collectedAmount ? Number(body.collectedAmount) : 0;
        const paymentMode = body.paymentMode || 'CASH';

        const remainingDue = totalAmount - collectedAmount;
        let status = 'PENDING';
        if (remainingDue <= 0 && collectedAmount > 0) status = 'PAID';
        else if (collectedAmount > 0) status = 'PARTIAL';

        const paymentHistory = collectedAmount > 0 ? [{
            paidOn: new Date(),
            amount: collectedAmount,
            mode: paymentMode,
            note: 'Initial payment at bill generation'
        }] : [];

        // UPDATE TENANT & ROOM STATE
        // 1. Update Tenant's start meter reading for next cycle and balance
        await Tenant.findByIdAndUpdate(tenantId, {
            $set: {
                meterReadingStart: endUnits, // Next month starts where this one ended
                outstandingBalance: remainingDue
            }
        });

        // 2. Update Room's persistent meter reading so newly added tenants or edits pick it up
        if (tenant.roomId) {
            // Use dynamic import or just rely on mongoose if model is compiled, 
            // but best to just use the Mongoose model registry to avoid circular dependency issues if any.
            // or just direct update since we have connection
            await mongoose.model('Room').findByIdAndUpdate(tenant.roomId, {
                currentMeterReading: endUnits
            });
        }

        // Create bill
        const bill = await MonthlyBill.create({
            ownerId: session.user.id,
            propertyId,
            tenantId,
            month,
            year,
            meter: {
                startUnits,
                endUnits,
                unitsConsumed
            },
            amounts: {
                ratePerUnit: settings.defaultRatePerUnit,
                waterCharge,
                rentAmount,
                previousDue,
                electricityAmount,
                totalAmount
            },
            payments: {
                amountPaid: collectedAmount,
                remainingDue: remainingDue,
                paymentHistory: paymentHistory
            },
            status: status
        });

        // Populate tenant and property info
        await bill.populate('tenantId', 'fullName roomNumber');
        await bill.populate('propertyId', 'name');

        return NextResponse.json(bill, { status: 201 });
    } catch (error: any) {
        console.error('Error creating bill:', error);
        return NextResponse.json({
            message: error.message || 'Error creating bill'
        }, { status: 500 });
    }
}

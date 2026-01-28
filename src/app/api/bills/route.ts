import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import MonthlyBill from '@/models/MonthlyBill';
import Tenant from '@/models/Tenant';
import User from '@/models/User';
import Settings from '@/models/Settings';
import MeterReading from '@/models/MeterReading';
import Room from '@/models/Room';

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
        const { tenantId, propertyId, month, year, roomReadings } = body;
        // roomReadings: [{ roomId, startUnits, endUnits, unitsConsumed }]

        // Validate required fields
        if (!tenantId || !propertyId || !month || !year || !Array.isArray(roomReadings)) {
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

        // Fetch tenant
        const tenantQuery: any = { _id: tenantId };
        if (session.user.role !== 'SUPER_ADMIN') {
            tenantQuery.ownerId = session.user.id;
        }
        const tenant = await Tenant.findOne(tenantQuery);

        if (!tenant) {
            return NextResponse.json({
                message: 'Tenant not found or access denied'
            }, { status: 404 });
        }

        // Fetch owner settings
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ message: 'Owner not found' }, { status: 404 });
        }
        const settings = user.settings;

        // Process Room Readings & Calculate Totals
        let totalUnitsConsumed = 0;
        let totalElectricityAmount = 0;
        const electricityRate = settings?.electricityRatePerUnit || 0;
        const billRoomDetails = [];

        for (const reading of roomReadings) {
            const { roomId, startUnits, endUnits } = reading;
            const consumed = Math.max(0, endUnits - startUnits);

            totalUnitsConsumed += consumed;

            // Find rent from tenant's assignment
            const roomAssignment = tenant.rooms?.find((r: any) => r.roomId.toString() === roomId)
                || (tenant.roomId?.toString() === roomId ? tenant : null); // Fallback

            const rent = roomAssignment ? (roomAssignment.baseRent || 0) : 0;
            const roomNum = roomAssignment ? (roomAssignment.roomNumber || '') : '';

            billRoomDetails.push({
                roomId,
                roomNumber: roomNum,
                rentAmount: rent,
                meter: {
                    startUnits,
                    endUnits,
                    unitsConsumed: consumed
                }
            });

            // SYNC WITH METER READINGS COLLECTION (Per Room)
            const existingReading = await MeterReading.findOne({
                tenantId,
                roomId,
                value: endUnits
            });

            if (!existingReading) {
                await MeterReading.create({
                    tenantId,
                    roomId,
                    ownerId: session.user.id,
                    readingDate: new Date(),
                    value: endUnits,
                    previousValue: startUnits,
                    unitsConsumed: consumed
                });
            }

            // UPDATE ROOM PERSISTENT READING
            await Room.findByIdAndUpdate(roomId, {
                currentMeterReading: endUnits
            });
        }

        totalElectricityAmount = totalUnitsConsumed * electricityRate;

        // Amounts
        const rentAmount = body.rentAmount !== undefined ? Number(body.rentAmount) : billRoomDetails.reduce((sum, r) => sum + r.rentAmount, 0); // Allow override or sum
        const waterCharge = body.waterCharge !== undefined ? Number(body.waterCharge) : (settings?.fixedWaterBill || 0);

        // Previous Due
        const previousBills = await MonthlyBill.find({
            tenantId,
            status: { $in: ['PENDING', 'PARTIAL'] }
        });

        const previousDue = previousBills.reduce((acc: number, b: any) => {
            return acc + (b.payments?.remainingDue || 0);
        }, 0);

        const totalAmount = rentAmount + totalElectricityAmount + waterCharge + previousDue;

        // Payment Logic
        const collectedAmount = body.collectedAmount ? Number(body.collectedAmount) : 0;
        const paymentMode = body.paymentMode || 'CASH';
        const settleBill = body.settleBill || false;

        let remainingDue = totalAmount - collectedAmount;
        let status = 'PENDING';

        const paymentHistory = collectedAmount > 0 ? [{
            paidOn: new Date(),
            amount: collectedAmount,
            mode: paymentMode,
            note: 'Initial payment at bill generation'
        }] : [];

        if (settleBill) {
            remainingDue = 0;
            status = 'PAID';
            // Add waiver logic if needed
        } else {
            if (remainingDue <= 0 && collectedAmount > 0) status = 'PAID';
            else if (collectedAmount > 0) status = 'PARTIAL';
        }

        // Update Tenant outstanding balance
        await Tenant.findByIdAndUpdate(tenantId, {
            $set: { outstandingBalance: remainingDue }
        });

        // Create Bill
        const bill = await MonthlyBill.create({
            ownerId: session.user.id,
            propertyId,
            tenantId,
            // roomId: ..., // Deprecated single field, leave empty or set to first room
            roomId: billRoomDetails[0]?.roomId,
            month,
            year,
            roomDetails: billRoomDetails,
            meter: {
                startUnits: 0, // Aggregated or N/A
                endUnits: 0,
                unitsConsumed: totalUnitsConsumed
            },
            amounts: {
                ratePerUnit: electricityRate,
                waterCharge,
                rentAmount,
                previousDue,
                electricityAmount: totalElectricityAmount,
                totalAmount
            },
            payments: {
                amountPaid: collectedAmount,
                remainingDue: remainingDue,
                paymentHistory: paymentHistory
            },
            status: status
        });

        await bill.populate('tenantId', 'fullName');
        await bill.populate('propertyId', 'name');

        return NextResponse.json(bill, { status: 201 });

    } catch (error: any) {
        console.error('Error creating bill:', error);
        return NextResponse.json({
            message: error.message || 'Error creating bill'
        }, { status: 500 });
    }
}

'use server';

import { NextResponse } from 'next/server';
import InitialPlan from '@/models/InitialPlan'; // Import the InitialPlan model
import connectDB from '@/lib/db'; // Import db connection utility
import mongoose from 'mongoose';

interface Params {
    id: string;
}

export async function GET(req: Request, { params }: { params: Params }) {
  const { id } = params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
       return new NextResponse(JSON.stringify({ message: 'Invalid Initial Plan ID format' }), {
           status: 400,
           headers: { 'Content-Type': 'application/json' },
        });
  }


  try {
    await connectDB(); // Ensure database connection

    // Fetch the initial plan by its ID
    // Sort phases by 'order' when fetching
    const initialPlan = await InitialPlan.findById(id).lean(); // Use .lean() for plain JS object

     if (!initialPlan) {
        return new NextResponse(JSON.stringify({ message: 'Initial Plan not found' }), {
           status: 404,
           headers: { 'Content-Type': 'application/json' },
        });
     }

     // Ensure phases are sorted by order before sending
     if (initialPlan.phases) {
        initialPlan.phases.sort((a, b) => a.order - b.order);
     }


    return NextResponse.json({ initialPlan });

  } catch (error) {
    console.error(`Error fetching initial plan with ID ${id}:`, error);
    return new NextResponse(JSON.stringify({
      message: 'Failed to fetch initial plan.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

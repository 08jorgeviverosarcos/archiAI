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
  console.log(`GET /api/initial-plans/${id} called`);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
       console.error(`Invalid Initial Plan ID format: ${id}`);
       return new NextResponse(JSON.stringify({ message: 'Invalid Initial Plan ID format' }), {
           status: 400,
           headers: { 'Content-Type': 'application/json' },
        });
  }


  try {
    await connectDB(); // Ensure database connection
    console.log("Database connected for fetching initial plan.");

    // Fetch the initial plan by its ID
    // Sort phases by 'order' when fetching
    const initialPlan = await InitialPlan.findById(id).lean(); // Use .lean() for plain JS object

     if (!initialPlan) {
        console.warn(`Initial Plan with ID ${id} not found.`);
        return new NextResponse(JSON.stringify({ message: 'Initial Plan not found' }), {
           status: 404,
           headers: { 'Content-Type': 'application/json' },
        });
     }

     console.log(`Initial Plan found:`, JSON.stringify(initialPlan, null, 2)); // Log the found plan

     // Ensure phases are sorted by order before sending (double-check if needed)
     if (initialPlan.phases && Array.isArray(initialPlan.phases)) {
        initialPlan.phases.sort((a, b) => a.order - b.order);
        console.log("Phases sorted by order.");
     } else {
        console.warn(`Initial Plan ${id} has no phases or phases is not an array.`);
        // Ensure phases is at least an empty array if null/undefined
        initialPlan.phases = initialPlan.phases || [];
     }

    // Return the entire initialPlan document, including phases
    return NextResponse.json({ initialPlan });

  } catch (error) {
    console.error(`Error fetching initial plan with ID ${id}:`, error);
    return new NextResponse(JSON.stringify({
      message: 'Failed to fetch initial plan.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  // Mongoose connection managed by connectDB utility
}

    
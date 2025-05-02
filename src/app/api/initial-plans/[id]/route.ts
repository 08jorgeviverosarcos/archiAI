'use server';

import { NextResponse } from 'next/server';
import InitialPlan from '@/models/InitialPlan'; // Import the InitialPlan model
import connectDB from '@/lib/db'; // Import db connection utility
import mongoose from 'mongoose';

interface Params {
    id: string; // This will now be the projectId
}

export async function GET(req: Request, { params }: { params: Params }) {
  const projectId = params.id; // Use id as projectId
  console.log(`GET /api/initial-plans/${projectId} (by projectId) called`);

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
       console.error(`Invalid Project ID format: ${projectId}`);
       return new NextResponse(JSON.stringify({ message: 'Invalid Project ID format' }), {
           status: 400,
           headers: { 'Content-Type': 'application/json' },
        });
  }


  try {
    await connectDB(); // Ensure database connection
    console.log("Database connected for fetching initial plan by projectId.");

    // Fetch the initial plan using the projectId field
    const initialPlan = await InitialPlan.findOne({ projectId: new mongoose.Types.ObjectId(projectId) }).lean(); // Use findOne with projectId

     if (!initialPlan) {
        console.warn(`Initial Plan for Project ID ${projectId} not found.`);
        return new NextResponse(JSON.stringify({ message: 'Initial Plan not found for this project' }), {
           status: 404,
           headers: { 'Content-Type': 'application/json' },
        });
     }

     console.log(`Initial Plan found for project ${projectId}:`, JSON.stringify(initialPlan, null, 2)); // Log the found plan

     // Ensure phases are sorted by order before sending
     if (initialPlan.phases && Array.isArray(initialPlan.phases)) {
        // Ensure order is treated as a number for sorting
        initialPlan.phases.sort((a, b) => Number(a.order) - Number(b.order));
        console.log("Phases sorted by order.");
     } else {
        console.warn(`Initial Plan for project ${projectId} has no phases or phases is not an array.`);
        // Ensure phases is at least an empty array if null/undefined
        initialPlan.phases = initialPlan.phases || [];
     }

    // Return the entire initialPlan document, including phases
    // The structure now returns { initialPlan: { _id: ..., projectId: ..., phases: [...] } }
    return NextResponse.json({ initialPlan });

  } catch (error) {
    console.error(`Error fetching initial plan for project ID ${projectId}:`, error);
    return new NextResponse(JSON.stringify({
      message: 'Failed to fetch initial plan.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  // Mongoose connection managed by connectDB utility
}
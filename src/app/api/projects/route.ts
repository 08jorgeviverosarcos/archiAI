'use server';

import { NextResponse } from 'next/server';
import Project from '@/models/Project'; // Import the Project model
import connectDB from '@/lib/db'; // Import db connection utility

export async function GET(req: Request) {
  try {
    await connectDB(); // Ensure database connection

    // Fetch all projects, selecting necessary fields
    // Populate initialPlan to get its details if needed immediately,
    // or just fetch project details and let the frontend fetch the plan later.
    // For now, just fetch project details including the initialPlan ID.
    const projects = await Project.find({})
        .select('_id projectName projectType initialPlanId createdAt updatedAt') // Select specific fields
        .sort({ createdAt: -1 }); // Sort by creation date, newest first

    return NextResponse.json({ projects });

  } catch (error) {
    console.error('Error fetching projects:', error);
    return new NextResponse(JSON.stringify({
      message: 'Failed to fetch projects.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

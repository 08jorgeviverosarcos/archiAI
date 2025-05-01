'use server';

import { NextResponse } from 'next/server';
import Project from '@/models/Project'; // Import the Project model
import connectDB from '@/lib/db'; // Import db connection utility
import mongoose from 'mongoose';

interface Params {
    id: string;
}

export async function GET(req: Request, { params }: { params: Params }) {
  const { id } = params;

   if (!id || !mongoose.Types.ObjectId.isValid(id)) {
       return new NextResponse(JSON.stringify({ message: 'Invalid Project ID format' }), {
           status: 400,
           headers: { 'Content-Type': 'application/json' },
        });
   }

  try {
    await connectDB(); // Ensure database connection

    // Fetch the project by its ID
    // Decide if you want to populate the initialPlan here or let the frontend fetch separately
    // For dashboard, fetching project details first might be better.
    const project = await Project.findById(id)
        // .populate('initialPlan') // Optionally populate if needed immediately
        .lean(); // Use lean for performance if not modifying

    if (!project) {
      return new NextResponse(JSON.stringify({ message: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Convert ObjectId to string if needed by frontend/types
     if (project.initialPlan) {
        project.initialPlanId = project.initialPlan.toString();
        delete project.initialPlan; // Remove the ObjectId if sending string ID
     }


    return NextResponse.json({ project });

  } catch (error) {
    console.error(`Error fetching project with ID ${id}:`, error);
    return new NextResponse(JSON.stringify({
      message: 'Failed to fetch project.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// You might add PUT/DELETE handlers here later to update/delete projects

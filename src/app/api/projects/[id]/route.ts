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
    // We no longer need to worry about populating or handling initialPlanId here
    const project = await Project.findById(id).lean(); // Use lean for performance if not modifying

    if (!project) {
      return new NextResponse(JSON.stringify({ message: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // No need to handle initialPlanId anymore in the Project response

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

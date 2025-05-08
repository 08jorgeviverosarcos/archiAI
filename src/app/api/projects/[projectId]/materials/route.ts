
'use server';

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MaterialProject from '@/models/MaterialProject';
import Project from '@/models/Project'; // To verify project existence
import mongoose from 'mongoose';
import { z } from 'zod';

interface Params {
  projectId: string;
}

const materialProjectCreateSchema = z.object({
  referenceCode: z.string().min(1, "Reference code is required"),
  brand: z.string().min(1, "Brand is required"),
  supplier: z.string().min(1, "Supplier is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0, "Quantity must be non-negative").default(0),
  unitOfMeasure: z.string().min(1, "Unit of measure is required"),
  estimatedUnitPrice: z.number().min(0, "Estimated unit price must be non-negative").default(0),
  purchasedValue: z.number().min(0, "Purchased value must be non-negative").default(0),
  profitMargin: z.number().min(0).optional().default(0),
});

// GET all materials for a specific project
export async function GET(request: Request, { params }: { params: Params }) {
  const { projectId } = params;

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    return new NextResponse(JSON.stringify({ message: 'Invalid Project ID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await connectDB();

    const materials = await MaterialProject.find({ projectId: new mongoose.Types.ObjectId(projectId) }).sort({ createdAt: -1 });
    
    return NextResponse.json({ materials });
  } catch (error) {
    console.error(`Error fetching materials for project ${projectId}:`, error);
    return new NextResponse(JSON.stringify({
      message: 'Failed to fetch materials.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// POST a new material to a specific project
export async function POST(request: Request, { params }: { params: Params }) {
  const { projectId } = params;

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    return new NextResponse(JSON.stringify({ message: 'Invalid Project ID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await connectDB();

    // Check if project exists
    const projectExists = await Project.findById(projectId);
    if (!projectExists) {
      return new NextResponse(JSON.stringify({ message: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const parsedBody = materialProjectCreateSchema.parse(body);

    const newMaterialProject = new MaterialProject({
      ...parsedBody,
      projectId: new mongoose.Types.ObjectId(projectId),
    });

    await newMaterialProject.save();

    return NextResponse.json({ materialProject: newMaterialProject }, { status: 201 });
  } catch (error) {
    console.error(`Error creating material for project ${projectId}:`, error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({ message: "Validation error", errors: error.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (error instanceof mongoose.Error.MongoServerError && error.code === 11000) {
      // Duplicate key error (e.g. referenceCode not unique for project)
      return new NextResponse(JSON.stringify({ message: 'A material with this reference code already exists for this project.' }), {
        status: 409, // Conflict
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new NextResponse(JSON.stringify({
      message: 'Failed to create material.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

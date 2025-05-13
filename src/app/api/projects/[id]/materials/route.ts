
'use server';

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MaterialProject from '@/models/MaterialProject';
import Project from '@/models/Project'; // To verify project existence
import mongoose from 'mongoose';
import { z } from 'zod';

interface Params {
  id: string;
}

const unitsOfMeasure = [
  'm', 'm²', 'm³', 'kg', 'L', 'gal', 'unidad', 'caja', 'rollo', 'bolsa', 'hr', 'día', 'semana', 'mes', 'global', 'pulg', 'pie', 'yd', 'ton', 'lb'
] as const;

const materialProjectCreateSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  referenceCode: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  unitOfMeasure: z.enum(unitsOfMeasure, {
    required_error: "La unidad de medida es requerida.",
  }),
  estimatedUnitPrice: z.number().min(0, "Estimated unit price must be non-negative").default(0),
  profitMargin: z.number().min(0).optional().nullable().default(null),
});

// GET all materials for a specific project
export async function GET(request: Request, { params }: { params: Params }) {
  const { id: projectId } = params;

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
  const { id: projectId } = params;

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

    const newMaterialProjectData: any = {
      projectId: new mongoose.Types.ObjectId(projectId),
      title: parsedBody.title,
      unitOfMeasure: parsedBody.unitOfMeasure,
      estimatedUnitPrice: parsedBody.estimatedUnitPrice,
    };

    // Explicitly assign optional fields if they are present in parsedBody (even if null)
    if (Object.prototype.hasOwnProperty.call(parsedBody, 'referenceCode')) {
      newMaterialProjectData.referenceCode = parsedBody.referenceCode;
    }
    if (Object.prototype.hasOwnProperty.call(parsedBody, 'brand')) {
      newMaterialProjectData.brand = parsedBody.brand;
    }
    if (Object.prototype.hasOwnProperty.call(parsedBody, 'supplier')) {
      newMaterialProjectData.supplier = parsedBody.supplier;
    }
    if (Object.prototype.hasOwnProperty.call(parsedBody, 'description')) {
      newMaterialProjectData.description = parsedBody.description;
    }
    if (Object.prototype.hasOwnProperty.call(parsedBody, 'profitMargin')) {
        newMaterialProjectData.profitMargin = parsedBody.profitMargin;
    }
    
    const newMaterialProject = new MaterialProject(newMaterialProjectData);
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
    return new NextResponse(JSON.stringify({
      message: 'Failed to create material.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}


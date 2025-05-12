
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

    // Prepare data for new material.
    // Pass values directly from Zod parsing. If a field is optional and not in the
    // request, Zod makes it `undefined`. If `null` is sent, Zod makes it `null`.
    // Mongoose schema with `required: false` will handle `undefined` by omitting the field
    // and `null` by storing `null`.
    const newMaterialProjectData: any = {
      projectId: new mongoose.Types.ObjectId(projectId),
      title: parsedBody.title,
      unitOfMeasure: parsedBody.unitOfMeasure,
      estimatedUnitPrice: parsedBody.estimatedUnitPrice,
      // profitMargin from Zod is already number or null (due to .default(null))
    };

    // Conditionally add optional fields if they are not undefined (i.e., they were present in parsedBody)
    // Zod `optional().nullable()` means a field can be string, null, or undefined (if not in payload).
    // We only set the field on the Mongoose object if it's not undefined.
    // If it was `null` in the payload, `parsedBody.fieldName` will be `null`.
    if (parsedBody.referenceCode !== undefined) {
      newMaterialProjectData.referenceCode = parsedBody.referenceCode;
    }
    if (parsedBody.brand !== undefined) {
      newMaterialProjectData.brand = parsedBody.brand;
    }
    if (parsedBody.supplier !== undefined) {
      newMaterialProjectData.supplier = parsedBody.supplier;
    }
    if (parsedBody.description !== undefined) {
      newMaterialProjectData.description = parsedBody.description;
    }
    // profitMargin is handled by Zod's .default(null), so it will be number or null.
    // We can pass it directly if it's not undefined (though with .default(null) it shouldn't be undefined).
    if (parsedBody.profitMargin !== undefined) {
        newMaterialProjectData.profitMargin = parsedBody.profitMargin;
    }


    // Check for duplicate referenceCode for this project only if referenceCode is provided and not null
    if (newMaterialProjectData.referenceCode) { // Check if it's truthy (not null, not undefined, not empty string)
        const existingMaterialWithRefCode = await MaterialProject.findOne({
            projectId: newMaterialProjectData.projectId,
            referenceCode: newMaterialProjectData.referenceCode
        });
        if (existingMaterialWithRefCode) {
             return new NextResponse(JSON.stringify({ message: 'A material with this reference code already exists for this project.' }), {
                status: 409, // Conflict
                headers: { 'Content-Type': 'application/json' },
            });
        }
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
    if (error instanceof mongoose.Error.MongoServerError && error.code === 11000) {
         return new NextResponse(JSON.stringify({ message: 'A material with this reference code already exists for this project or another unique constraint was violated.' }), {
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

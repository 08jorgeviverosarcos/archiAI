
'use server';

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MaterialProject from '@/models/MaterialProject';
import mongoose from 'mongoose';
import { z } from 'zod';

interface Params {
  materialProjectId: string;
}

const unitsOfMeasure = [
  'm', 'm²', 'm³', 'kg', 'L', 'gal', 'unidad', 'caja', 'rollo', 'bolsa', 'hr', 'día', 'semana', 'mes', 'global', 'pulg', 'pie', 'yd', 'ton', 'lb'
] as const;

const materialProjectUpdateSchema = z.object({
  title: z.string().min(1, "El título es requerido").optional(),
  referenceCode: z.string().min(1, "Reference code is required").optional(),
  brand: z.string().min(1, "Brand is required").optional(),
  supplier: z.string().min(1, "Supplier is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
  unitOfMeasure: z.enum(unitsOfMeasure, {
    errorMap: () => ({ message: "La unidad de medida es inválida." }),
  }).optional(),
  estimatedUnitPrice: z.number().min(0, "Estimated unit price must be non-negative").optional(),
  profitMargin: z.number().min(0).optional().nullable(), // Allow null
}).strict(); // Ensure no extra fields are passed

// GET a specific material project by its ID
export async function GET(request: Request, { params }: { params: Params }) {
  const { materialProjectId } = params;

  if (!materialProjectId || !mongoose.Types.ObjectId.isValid(materialProjectId)) {
    return new NextResponse(JSON.stringify({ message: 'Invalid MaterialProject ID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await connectDB();

    const materialProject = await MaterialProject.findById(materialProjectId);

    if (!materialProject) {
      return new NextResponse(JSON.stringify({ message: 'MaterialProject not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.json({ materialProject });
  } catch (error) {
    console.error(`Error fetching MaterialProject ${materialProjectId}:`, error);
    return new NextResponse(JSON.stringify({
      message: 'Failed to fetch MaterialProject.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// PUT (update) a specific material project by its ID
export async function PUT(request: Request, { params }: { params: Params }) {
  const { materialProjectId } = params;

  if (!materialProjectId || !mongoose.Types.ObjectId.isValid(materialProjectId)) {
    return new NextResponse(JSON.stringify({ message: 'Invalid MaterialProject ID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await connectDB();
    const body = await request.json();
    
    // Explicitly handle null for profitMargin if sent as empty string or undefined
    if (body.profitMargin === '' || body.profitMargin === undefined) {
        body.profitMargin = null;
    } else if (body.profitMargin !== null) {
        body.profitMargin = Number(body.profitMargin);
    }

    const parsedBody = materialProjectUpdateSchema.parse(body);

    const updatedMaterialProject = await MaterialProject.findByIdAndUpdate(
      materialProjectId,
      { $set: parsedBody },
      { new: true, runValidators: true }
    );

    if (!updatedMaterialProject) {
      return new NextResponse(JSON.stringify({ message: 'MaterialProject not found for update' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.json({ materialProject: updatedMaterialProject });
  } catch (error) {
    console.error(`Error updating MaterialProject ${materialProjectId}:`, error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({ message: "Validation error", errors: error.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
     if (error instanceof mongoose.Error.MongoServerError && error.code === 11000) {
      return new NextResponse(JSON.stringify({ message: 'A material with this reference code already exists for this project.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new NextResponse(JSON.stringify({
      message: 'Failed to update MaterialProject.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// DELETE a specific material project by its ID
export async function DELETE(request: Request, { params }: { params: Params }) {
  const { materialProjectId } = params;

  if (!materialProjectId || !mongoose.Types.ObjectId.isValid(materialProjectId)) {
    return new NextResponse(JSON.stringify({ message: 'Invalid MaterialProject ID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await connectDB();

    const deletedMaterialProject = await MaterialProject.findByIdAndDelete(materialProjectId);

    if (!deletedMaterialProject) {
      return new NextResponse(JSON.stringify({ message: 'MaterialProject not found for deletion' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Also delete related MaterialTask entries (cascade delete)
    // await MaterialTask.deleteMany({ materialProjectId: new mongoose.Types.ObjectId(materialProjectId) });


    return NextResponse.json({ message: 'MaterialProject deleted successfully' });
  } catch (error) {
    console.error(`Error deleting MaterialProject ${materialProjectId}:`, error);
    return new NextResponse(JSON.stringify({
      message: 'Failed to delete MaterialProject.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

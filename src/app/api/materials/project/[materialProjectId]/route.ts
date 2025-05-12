
'use server';

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MaterialProject from '@/models/MaterialProject';
import mongoose from 'mongoose';
import { z } from 'zod';

interface Params {
  materialProjectId: string;
}

const unitsOfMeasureValues = [
  'm', 'm²', 'm³', 'kg', 'L', 'gal', 'unidad', 'caja', 'rollo', 'bolsa', 'hr', 'día', 'semana', 'mes', 'global', 'pulg', 'pie', 'yd', 'ton', 'lb'
] as const;

// Updated schema for PUT requests: All fields are optional
const materialProjectUpdateSchema = z.object({
  title: z.string().min(1, "El título es requerido").optional(),
  referenceCode: z.string().optional().nullable(), // Optional, allow null
  brand: z.string().optional().nullable(), // Optional, allow null
  supplier: z.string().optional().nullable(), // Optional, allow null
  description: z.string().optional().nullable(), // Optional, allow null
  unitOfMeasure: z.enum(unitsOfMeasureValues, {
    errorMap: () => ({ message: "La unidad de medida es inválida." }),
  }).optional(),
  estimatedUnitPrice: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(0, "El precio unitario estimado debe ser no negativo").optional()
  ),
  profitMargin: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)), // Ensure empty string becomes null
    z.number().min(0, "El margen de utilidad debe ser no negativo").nullable().optional()
  ),
}).strict();


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
  console.log(`PUT /api/materials/project/${materialProjectId} called`);

  if (!materialProjectId || !mongoose.Types.ObjectId.isValid(materialProjectId)) {
    console.error(`Invalid MaterialProject ID format: ${materialProjectId}`);
    return new NextResponse(JSON.stringify({ message: 'Invalid MaterialProject ID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await connectDB();
    console.log(`Database connected for updating material project ${materialProjectId}.`);

    const body = await request.json();
    console.log(`Raw request body for update (PUT):`, JSON.stringify(body, null, 2));

    // Validate request body
    const parsedBody = materialProjectUpdateSchema.parse(body);
    console.log(`Parsed body for update (PUT):`, JSON.stringify(parsedBody, null, 2));

    if (Object.keys(parsedBody).length === 0) {
        return new NextResponse(JSON.stringify({ message: 'No update data provided' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    
    // Mongoose will only update fields present in parsedBody due to $set
    const updatedMaterialProject = await MaterialProject.findByIdAndUpdate(
      materialProjectId,
      { $set: parsedBody }, 
      { new: true, runValidators: true }
    );

    if (!updatedMaterialProject) {
      console.warn(`MaterialProject with ID ${materialProjectId} not found after attempting update.`);
      return new NextResponse(JSON.stringify({ message: 'MaterialProject not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`MaterialProject ${materialProjectId} updated successfully (PUT):`, updatedMaterialProject);
    return NextResponse.json({ materialProject: updatedMaterialProject });

  } catch (error) {
    console.error(`Error updating material project ${materialProjectId} (PUT):`, error);
    if (error instanceof z.ZodError) {
       console.error("Zod Validation Errors (PUT):", error.errors);
      return new NextResponse(JSON.stringify({
        message: "Validation error",
        errors: error.errors
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Detailed error message (PUT):", errorMessage);

    return new NextResponse(JSON.stringify({
      message: 'Failed to update material project.',
      error: errorMessage,
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

        return NextResponse.json({ message: 'MaterialProject deleted successfully' });
    } catch (error) {
        console.error(`Error deleting MaterialProject ${materialProjectId}:`, error);
        return new NextResponse(JSON.stringify({
            message: 'Failed to delete MaterialProject.',
            error: error instanceof Error ? error.message : String(error),
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

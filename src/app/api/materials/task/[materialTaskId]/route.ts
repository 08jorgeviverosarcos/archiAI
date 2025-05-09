
'use server';

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MaterialTask from '@/models/MaterialTask';
import MaterialProject from '@/models/MaterialProject'; // Needed for recalculating cost
import mongoose from 'mongoose';
import { z } from 'zod';

interface Params {
  materialTaskId: string;
}

const materialTaskUpdateSchema = z.object({
  quantityUsed: z.number().min(0.000001, "Quantity used must be greater than 0").optional(),
  profitMarginForTaskMaterial: z.number().min(0).optional().nullable(),
  purchasedValueForTask: z.number().optional().nullable(),
  // materialProjectId and phaseId are generally not updatable this way,
  // if needs to change, it's better to delete and create a new MaterialTask
}).strict();

// GET a specific material task by its ID
export async function GET(request: Request, { params }: { params: Params }) {
  const { materialTaskId } = params;

  if (!materialTaskId || !mongoose.Types.ObjectId.isValid(materialTaskId)) {
    return new NextResponse(JSON.stringify({ message: 'Invalid MaterialTask ID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await connectDB();

    const materialTask = await MaterialTask.findById(materialTaskId)
        .populate({
            path: 'materialProjectId',
            model: MaterialProject,
            select: 'title referenceCode description unitOfMeasure estimatedUnitPrice profitMargin' // Updated select
        });

    if (!materialTask) {
      return new NextResponse(JSON.stringify({ message: 'MaterialTask not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.json({ materialTask });
  } catch (error) {
    console.error(`Error fetching MaterialTask ${materialTaskId}:`, error);
    return new NextResponse(JSON.stringify({
      message: 'Failed to fetch MaterialTask.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}


// PUT (update) a specific material task by its ID
export async function PUT(request: Request, { params }: { params: Params }) {
  const { materialTaskId } = params;

  if (!materialTaskId || !mongoose.Types.ObjectId.isValid(materialTaskId)) {
    return new NextResponse(JSON.stringify({ message: 'Invalid MaterialTask ID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await connectDB();
    const body = await request.json();
    const parsedBody = materialTaskUpdateSchema.parse(body);

    if (Object.keys(parsedBody).length === 0) {
        return new NextResponse(JSON.stringify({ message: 'No update data provided' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const existingMaterialTask = await MaterialTask.findById(materialTaskId);
    if (!existingMaterialTask) {
        return new NextResponse(JSON.stringify({ message: 'MaterialTask not found for update' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    
    const updateData: Partial<mongoose.UpdateQuery<typeof existingMaterialTask>> = {};

    if (parsedBody.quantityUsed !== undefined) {
        updateData.quantityUsed = parsedBody.quantityUsed;
        // Recalculate materialCostForTask if quantityUsed changes
        const materialProject = await MaterialProject.findById(existingMaterialTask.materialProjectId);
        if (materialProject) {
            updateData.materialCostForTask = parsedBody.quantityUsed * (materialProject.estimatedUnitPrice || 0);
        } else {
            console.warn(`MaterialProject with ID ${existingMaterialTask.materialProjectId} not found during MaterialTask update.`);
            updateData.materialCostForTask = 0; 
        }
    }

    if (parsedBody.profitMarginForTaskMaterial !== undefined) {
        updateData.profitMarginForTaskMaterial = parsedBody.profitMarginForTaskMaterial;
    }

    if (parsedBody.purchasedValueForTask !== undefined) {
        updateData.purchasedValueForTask = parsedBody.purchasedValueForTask;
    }


    const updatedMaterialTask = await MaterialTask.findByIdAndUpdate(
      materialTaskId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate({
        path: 'materialProjectId',
        model: MaterialProject,
        select: 'title referenceCode description unitOfMeasure estimatedUnitPrice profitMargin' // Updated select
    });

    if (!updatedMaterialTask) {
      return new NextResponse(JSON.stringify({ message: 'MaterialTask not found after update attempt (should not happen)' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.json({ materialTask: updatedMaterialTask });
  } catch (error) {
    console.error(`Error updating MaterialTask ${materialTaskId}:`, error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({ message: "Validation error", errors: error.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new NextResponse(JSON.stringify({
      message: 'Failed to update MaterialTask.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// DELETE a specific material task by its ID
export async function DELETE(request: Request, { params }: { params: Params }) {
  const { materialTaskId } = params;

  if (!materialTaskId || !mongoose.Types.ObjectId.isValid(materialTaskId)) {
    return new NextResponse(JSON.stringify({ message: 'Invalid MaterialTask ID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await connectDB();

    const deletedMaterialTask = await MaterialTask.findByIdAndDelete(materialTaskId);

    if (!deletedMaterialTask) {
      return new NextResponse(JSON.stringify({ message: 'MaterialTask not found for deletion' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.json({ message: 'MaterialTask deleted successfully' });
  } catch (error) {
    console.error(`Error deleting MaterialTask ${materialTaskId}:`, error);
    return new NextResponse(JSON.stringify({
      message: 'Failed to delete MaterialTask.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

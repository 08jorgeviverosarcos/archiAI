
'use server';

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MaterialTask from '@/models/MaterialTask';
import Task from '@/models/Task'; // To verify task existence and get phaseId
import MaterialProject from '@/models/MaterialProject'; // To verify materialProject existence and get unit price/profit margin
import mongoose from 'mongoose';
import { z } from 'zod';

interface Params {
  taskId: string;
}

const materialTaskCreateSchema = z.object({
  materialProjectId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid MaterialProject ID",
  }),
  quantityUsed: z.number().min(0.000001, "Quantity used must be greater than 0"), // Ensure quantity is positive
  // materialCostForTask and profitMarginForTaskMaterial will be derived or copied
});

// GET all materials for a specific task
export async function GET(request: Request, { params }: { params: Params }) {
  const { taskId } = params;

  if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
    return new NextResponse(JSON.stringify({ message: 'Invalid Task ID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await connectDB();

    const materialsForTask = await MaterialTask.find({ taskId: new mongoose.Types.ObjectId(taskId) })
      .populate({
          path: 'materialProjectId',
          model: MaterialProject, // Explicitly specify the model for population
          select: 'referenceCode description unitOfMeasure estimatedUnitPrice' // Select fields you need from MaterialProject
      })
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ materialsForTask });
  } catch (error) {
    console.error(`Error fetching materials for task ${taskId}:`, error);
    return new NextResponse(JSON.stringify({
      message: 'Failed to fetch materials for task.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// POST a new material assignment to a specific task
export async function POST(request: Request, { params }: { params: Params }) {
  const { taskId } = params;

  if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
    return new NextResponse(JSON.stringify({ message: 'Invalid Task ID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await connectDB();

    const taskExists = await Task.findById(taskId);
    if (!taskExists) {
      return new NextResponse(JSON.stringify({ message: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!taskExists.phaseUUID) {
        return new NextResponse(JSON.stringify({ message: 'Task does not have a phaseUUID' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
    }

    const body = await request.json();
    const parsedBody = materialTaskCreateSchema.parse(body);

    const materialProjectExists = await MaterialProject.findById(parsedBody.materialProjectId);
    if (!materialProjectExists) {
        return new NextResponse(JSON.stringify({ message: 'Referenced MaterialProject not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
    }
    if (materialProjectExists.projectId.toString() !== taskExists.projectId.toString()) {
        return new NextResponse(JSON.stringify({ message: 'MaterialProject does not belong to the same project as the Task' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
    }

    // Calculate materialCostForTask and snapshot profitMargin
    const materialCostForTask = parsedBody.quantityUsed * (materialProjectExists.estimatedUnitPrice || 0);
    const profitMarginForTaskMaterial = materialProjectExists.profitMargin; // Snapshot the profit margin

    const newMaterialTask = new MaterialTask({
      taskId: new mongoose.Types.ObjectId(taskId),
      materialProjectId: new mongoose.Types.ObjectId(parsedBody.materialProjectId),
      phaseId: taskExists.phaseUUID,
      quantityUsed: parsedBody.quantityUsed,
      materialCostForTask: materialCostForTask,
      profitMarginForTaskMaterial: profitMarginForTaskMaterial,
    });

    await newMaterialTask.save();
    
    // Populate materialProjectId for the response
    const populatedMaterialTask = await MaterialTask.findById(newMaterialTask._id)
      .populate({
          path: 'materialProjectId',
          model: MaterialProject,
          select: 'referenceCode description unitOfMeasure estimatedUnitPrice'
      });


    return NextResponse.json({ materialTask: populatedMaterialTask }, { status: 201 });
  } catch (error) {
    console.error(`Error assigning material to task ${taskId}:`, error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({ message: "Validation error", errors: error.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (error instanceof mongoose.Error.MongoServerError && error.code === 11000) {
      return new NextResponse(JSON.stringify({ message: 'This material might already be assigned to this task in a unique way.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new NextResponse(JSON.stringify({
      message: 'Failed to assign material to task.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}


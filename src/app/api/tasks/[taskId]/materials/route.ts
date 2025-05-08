
'use server';

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MaterialTask from '@/models/MaterialTask';
import Task from '@/models/Task'; // To verify task existence and get phaseId
import MaterialProject from '@/models/MaterialProject'; // To verify materialProject existence
import mongoose from 'mongoose';
import { z } from 'zod';

interface Params {
  taskId: string;
}

const materialTaskCreateSchema = z.object({
  materialProjectId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid MaterialProject ID",
  }),
  quantityUsed: z.number().min(0, "Quantity used must be non-negative"),
  // phaseId will be derived from the Task
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
      .populate('materialProjectId') // Optionally populate details from MaterialProject
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

    // Check if task exists and get its phaseUUID
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

    // Check if materialProject exists
    const materialProjectExists = await MaterialProject.findById(parsedBody.materialProjectId);
    if (!materialProjectExists) {
        return new NextResponse(JSON.stringify({ message: 'Referenced MaterialProject not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
    }
    // Ensure the MaterialProject belongs to the same project as the Task
    if (materialProjectExists.projectId.toString() !== taskExists.projectId.toString()) {
        return new NextResponse(JSON.stringify({ message: 'MaterialProject does not belong to the same project as the Task' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
    }


    const newMaterialTask = new MaterialTask({
      ...parsedBody,
      taskId: new mongoose.Types.ObjectId(taskId),
      phaseId: taskExists.phaseUUID, // Set phaseId from the task
      materialProjectId: new mongoose.Types.ObjectId(parsedBody.materialProjectId),
    });

    await newMaterialTask.save();

    return NextResponse.json({ materialTask: newMaterialTask }, { status: 201 });
  } catch (error) {
    console.error(`Error assigning material to task ${taskId}:`, error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({ message: "Validation error", errors: error.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Handle potential duplicate key errors if you add unique indexes to MaterialTask
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


'use server';

import { NextResponse } from 'next/server';
import Task from '@/models/Task'; // Import the Task model
import connectDB from '@/lib/db'; // Import db connection utility
import mongoose from 'mongoose';
import { z } from 'zod';

interface Params {
    taskId: string;
}

// Schema for validating PUT request body (similar to create, but all fields optional)
const taskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(), // Allow explicitly setting to null
  quantity: z.number().min(0).optional(),
  unitOfMeasure: z.string().min(1).optional(),
  unitPrice: z.number().min(0).optional(),
  status: z.enum(['Pendiente', 'En Progreso', 'Realizado']).optional(),
  profitMargin: z.number().optional().nullable(),
  laborCost: z.number().min(0).optional().nullable(),
  // estimatedCost will be recalculated
}).strict(); // Prevent extra fields

// PUT handler to update a specific task
export async function PUT(req: Request, { params }: { params: Params }) {
  const { taskId } = params;
  console.log(`PUT /api/tasks/${taskId} called`);

  if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
    console.error(`Invalid Task ID format: ${taskId}`);
    return new NextResponse(JSON.stringify({ message: 'Invalid Task ID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await connectDB();
    console.log(`Database connected for updating task ${taskId}.`);

    const body = await req.json();
    console.log(`Request body for update:`, body);

    // Validate request body
    const parsedBody = taskUpdateSchema.parse(body);
    console.log(`Parsed body for update:`, parsedBody);

    // Find the existing task to recalculate cost based on potentially updated fields
    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      console.warn(`Task with ID ${taskId} not found for update.`);
      return new NextResponse(JSON.stringify({ message: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prepare update data, recalculating estimated cost
    const updateData: Partial<typeof parsedBody & { estimatedCost: number }> = { ...parsedBody };

    // Recalculate cost based on incoming changes or existing values
    const quantity = parsedBody.quantity ?? existingTask.quantity;
    const unitPrice = parsedBody.unitPrice ?? existingTask.unitPrice;
    const laborCost = parsedBody.laborCost ?? existingTask.laborCost ?? 0;
    // const profitMargin = parsedBody.profitMargin ?? existingTask.profitMargin; // Get profit margin

    let calculatedCost = (quantity * unitPrice) + laborCost;
    // Apply profit margin if it exists (either from update or existing)
    // if (profitMargin) {
    //   calculatedCost = calculatedCost * (1 + profitMargin / 100);
    // }

    updateData.estimatedCost = calculatedCost;

    // Perform the update
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: updateData }, // Use $set to update only provided fields
      { new: true, runValidators: true } // Return the updated document and run schema validators
    );


    if (!updatedTask) {
      // Should not happen if findById worked, but good practice
      console.warn(`Task with ID ${taskId} not found after attempting update.`);
      return new NextResponse(JSON.stringify({ message: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Task ${taskId} updated successfully:`, updatedTask);
    return NextResponse.json({ task: updatedTask });

  } catch (error) {
    console.error(`Error updating task ${taskId}:`, error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({
        message: "Validation error",
        errors: error.errors
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    return new NextResponse(JSON.stringify({
      message: 'Failed to update task.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// DELETE handler to delete a specific task
export async function DELETE(req: Request, { params }: { params: Params }) {
  const { taskId } = params;
   console.log(`DELETE /api/tasks/${taskId} called`);

  if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
       console.error(`Invalid Task ID format: ${taskId}`);
       return new NextResponse(JSON.stringify({ message: 'Invalid Task ID format' }), {
           status: 400,
           headers: { 'Content-Type': 'application/json' },
        });
  }

  try {
    await connectDB();
    console.log(`Database connected for deleting task ${taskId}.`);

    const deletedTask = await Task.findByIdAndDelete(taskId);

    if (!deletedTask) {
      console.warn(`Task with ID ${taskId} not found for deletion.`);
      return new NextResponse(JSON.stringify({ message: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Task ${taskId} deleted successfully.`);
    // Return 204 No Content or a success message
    // return new NextResponse(null, { status: 204 });
     return NextResponse.json({ message: 'Task deleted successfully' });


  } catch (error) {
    console.error(`Error deleting task ${taskId}:`, error);
    return new NextResponse(JSON.stringify({
      message: 'Failed to delete task.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

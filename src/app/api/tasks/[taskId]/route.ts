
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
  profitMargin: z.number().optional().nullable(), // Allow optional and nullable
  laborCost: z.number().min(0).optional().nullable(), // Allow optional and nullable
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

    // Prepare update data, including potentially null values for optional fields
    const updateData: Partial<typeof parsedBody & { estimatedCost: number }> = {};

    // Only include fields that are present in the parsedBody
     for (const key in parsedBody) {
        if (Object.prototype.hasOwnProperty.call(parsedBody, key)) {
            // Explicitly handle null values for optional fields
             if (key === 'profitMargin' || key === 'laborCost') {
                updateData[key as keyof typeof updateData] = parsedBody[key as keyof typeof parsedBody];
             } else if (parsedBody[key as keyof typeof parsedBody] !== undefined) {
                // @ts-ignore - Allow dynamic assignment
                updateData[key as keyof typeof updateData] = parsedBody[key as keyof typeof parsedBody];
            }
        }
    }


    // Recalculate cost based on incoming changes or existing values
    const quantity = parsedBody.quantity ?? existingTask.quantity;
    const unitPrice = parsedBody.unitPrice ?? existingTask.unitPrice;
    // Use ?? operator to safely handle null/undefined, falling back to 0 if needed
    const laborCost = (parsedBody.laborCost !== undefined ? parsedBody.laborCost : existingTask.laborCost) ?? 0;

    let calculatedCost = (quantity * unitPrice) + laborCost;
    // Profit margin is usually for reporting/pricing, not part of base cost
    // const profitMargin = (parsedBody.profitMargin !== undefined ? parsedBody.profitMargin : existingTask.profitMargin);
    // if (profitMargin !== null && profitMargin !== undefined) {
    //   calculatedCost = calculatedCost * (1 + profitMargin / 100);
    // }

    // Only update estimatedCost if relevant fields changed
    if (parsedBody.quantity !== undefined || parsedBody.unitPrice !== undefined || parsedBody.laborCost !== undefined) {
      updateData.estimatedCost = calculatedCost;
    }

    console.log(`Update data being sent to MongoDB:`, updateData);

    // Perform the update using $set to update only provided fields
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: updateData },
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
       console.error("Zod Validation Errors:", error.errors);
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

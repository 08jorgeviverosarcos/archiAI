'use server';

import { NextResponse } from 'next/server';
import Task from '@/models/Task'; // Import the Task model
import connectDB from '@/lib/db'; // Import db connection utility
import mongoose from 'mongoose';
import { z } from 'zod';

interface Params {
    taskId: string;
}

// Schema for validating PUT request body (updated for new fields)
const taskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(), // Allow explicitly setting to null
  quantity: z.number().min(0).optional(),
  unitOfMeasure: z.string().min(1).optional(),
  unitPrice: z.number().min(0).optional(),
  estimatedDuration: z.number().min(0).optional().nullable(), // Optional duration, allow null
  status: z.enum(['Pendiente', 'En Progreso', 'Realizado']).optional(),
  profitMargin: z.number().optional().nullable(), // Allow optional and nullable
  laborCost: z.number().min(0).optional().nullable(), // Allow optional and nullable
  executionPercentage: z.number().min(0).max(100).optional().nullable(), // Optional percentage, allow null
  startDate: z.date().optional().nullable(), // Optional date, allow null
  endDate: z.date().optional().nullable(), // Optional date, allow null
  // estimatedCost will be recalculated
}).strict().refine(data => { // Add refinement for date validation
    if (data.startDate && data.endDate) {
         // Ensure dates are valid before comparison
         if (data.startDate instanceof Date && !isNaN(data.startDate.getTime()) &&
             data.endDate instanceof Date && !isNaN(data.endDate.getTime())) {
              return data.endDate >= data.startDate;
         }
         // If dates are not valid Date objects at this point, bypass validation
         return true;
    }
    return true;
}, {
    message: "La fecha de finalización debe ser posterior o igual a la fecha de inicio.",
    path: ["endDate"],
});


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
    console.log(`Raw request body for update (PUT):`, JSON.stringify(body, null, 2)); // Log raw body

    // Convert date strings to Date objects or null before validation
     try {
         if (body.startDate && typeof body.startDate === 'string') {
             const parsedStartDate = new Date(body.startDate);
             body.startDate = !isNaN(parsedStartDate.getTime()) ? parsedStartDate : null;
             if (isNaN(parsedStartDate.getTime())) console.warn("Invalid start date string received (PUT):", body.startDate);
         } else if (body.startDate === '' || body.startDate === undefined) {
             body.startDate = null;
         }

         if (body.endDate && typeof body.endDate === 'string') {
             const parsedEndDate = new Date(body.endDate);
             body.endDate = !isNaN(parsedEndDate.getTime()) ? parsedEndDate : null;
             if (isNaN(parsedEndDate.getTime())) console.warn("Invalid end date string received (PUT):", body.endDate);
         } else if (body.endDate === '' || body.endDate === undefined) {
             body.endDate = null;
         }
     } catch (dateError) {
        console.error("Error parsing dates before validation (PUT):", dateError);
        // Decide if this should be a hard error or just proceed with null dates
        body.startDate = null;
        body.endDate = null;
        // Potentially return a 400 error here
        // return new NextResponse(JSON.stringify({ message: 'Invalid date format provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    console.log(`Body after date preprocessing for update (PUT):`, JSON.stringify(body, null, 2));

    // Validate request body
    const parsedBody = taskUpdateSchema.parse(body);
    console.log(`Parsed body for update (PUT):`, JSON.stringify(parsedBody, null, 2));

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
    // Initialize with an empty object that conforms to the structure expected by $set
    const updateData: { [key: string]: any } = {};


    // Iterate over parsedBody keys and add them to updateData if they exist in parsedBody
     for (const key in parsedBody) {
        if (Object.prototype.hasOwnProperty.call(parsedBody, key)) {
             // Directly use the value from parsedBody, which could be null for optional fields
             // @ts-ignore - Allow dynamic assignment
            updateData[key as keyof typeof parsedBody] = parsedBody[key as keyof typeof parsedBody];
        }
    }


    // Recalculate cost based on incoming changes or existing values
    const quantity = parsedBody.quantity ?? existingTask.quantity;
    const unitPrice = parsedBody.unitPrice ?? existingTask.unitPrice;
    // Use ?? operator to safely handle null/undefined, falling back to 0 if needed
    const laborCost = (parsedBody.laborCost !== undefined ? parsedBody.laborCost : existingTask.laborCost) ?? 0;

    let calculatedCost = (quantity * unitPrice) + laborCost;

    // Only update estimatedCost if relevant fields changed
    if (parsedBody.quantity !== undefined || parsedBody.unitPrice !== undefined || parsedBody.laborCost !== undefined) {
      updateData.estimatedCost = calculatedCost;
    }

    // Log the final update data object just before sending to Mongoose
    console.log(`Update data being sent to MongoDB (PUT):`, JSON.stringify(updateData, null, 2));

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

    console.log(`Task ${taskId} updated successfully (PUT):`, updatedTask);
    return NextResponse.json({ task: updatedTask });

  } catch (error) {
    console.error(`Error updating task ${taskId} (PUT):`, error);
    if (error instanceof z.ZodError) {
       console.error("Zod Validation Errors (PUT):", error.errors);
      return new NextResponse(JSON.stringify({
        message: "Validation error",
        errors: error.errors
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    // Log the specific error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Detailed error message (PUT):", errorMessage);

    return new NextResponse(JSON.stringify({
      message: 'Failed to update task.',
      error: errorMessage, // Send specific error message
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


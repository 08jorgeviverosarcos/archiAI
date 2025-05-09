
'use server';

import { NextResponse } from 'next/server';
import Task from '@/models/Task'; // Import the Task model
import connectDB from '@/lib/db'; // Import db connection utility
import mongoose from 'mongoose';
import { z } from 'zod';

const unitsOfMeasure = [
  'm', 'm²', 'm³', 'kg', 'L', 'gal', 'unidad', 'caja', 'rollo', 'bolsa', 'hr', 'día', 'semana', 'mes', 'global', 'pulg', 'pie', 'yd', 'ton', 'lb'
] as const;

// Schema for validating POST request body - updated with new fields
const taskCreateSchema = z.object({
  projectId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), { message: "Invalid Project ID" }),
  phaseUUID: z.string().uuid({ message: "Invalid Phase UUID" }),
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().optional(),
  quantity: z.number().min(0, { message: "Quantity must be non-negative" }).default(1),
  unitOfMeasure: z.enum(unitsOfMeasure, {
    required_error: "La unidad de medida es requerida.",
  }),
  unitPrice: z.number().min(0, { message: "Unit price must be non-negative" }).default(0),
  estimatedDuration: z.number().min(0).optional().nullable(), // Optional duration
  status: z.enum(['Pendiente', 'En Progreso', 'Realizado']).default('Pendiente'),
  profitMargin: z.number().optional().nullable(), // Allow null
  laborCost: z.number().min(0).optional().nullable(), // Allow null
  executionPercentage: z.number().min(0).max(100).optional().nullable(), // Optional percentage
  startDate: z.date().optional().nullable(), // Optional date, allow null
  endDate: z.date().optional().nullable(), // Optional date, allow null
  // estimatedCost is calculated, not directly taken from input usually
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

// GET handler to fetch tasks based on projectId and phaseUUID
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const phaseUUID = searchParams.get('phaseUUID');

  console.log(`GET /api/tasks called with projectId: ${projectId}, phaseUUID: ${phaseUUID}`);

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    console.error(`Invalid Project ID format: ${projectId}`);
    return new NextResponse(JSON.stringify({ message: 'Invalid Project ID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!phaseUUID) {
      console.error(`Missing phaseUUID parameter`);
      return new NextResponse(JSON.stringify({ message: 'Phase UUID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  // Basic UUID validation (can be more robust)
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!uuidRegex.test(phaseUUID)) {
        console.error(`Invalid Phase UUID format: ${phaseUUID}`);
        return new NextResponse(JSON.stringify({ message: 'Invalid Phase UUID format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
  }


  try {
    await connectDB();
    console.log("Database connected for fetching tasks.");

    // Find tasks matching both projectId and phaseUUID
    const tasks = await Task.find({
      projectId: new mongoose.Types.ObjectId(projectId),
      phaseUUID: phaseUUID,
    }).sort({ createdAt: 1 }); // Sort by creation time or another relevant field

    console.log(`Found ${tasks.length} tasks for phase ${phaseUUID} in project ${projectId}.`);

    return NextResponse.json({ tasks });

  } catch (error) {
    console.error(`Error fetching tasks for project ${projectId}, phase ${phaseUUID}:`, error);
    return new NextResponse(JSON.stringify({
      message: 'Failed to fetch tasks.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// POST handler to create a new task
export async function POST(req: Request) {
  console.log("POST /api/tasks called");
  try {
    await connectDB();
    console.log("Database connected for creating task.");

    const body = await req.json();
    console.log("Raw request body (POST):", JSON.stringify(body, null, 2)); // Log raw body

    // Convert date strings to Date objects or null before validation
    try {
        if (body.startDate && typeof body.startDate === 'string') {
            const parsedStartDate = new Date(body.startDate);
            // Check if the parsed date is valid
            body.startDate = !isNaN(parsedStartDate.getTime()) ? parsedStartDate : null;
            if (isNaN(parsedStartDate.getTime())) console.warn("Invalid start date string received:", body.startDate);
        } else if (body.startDate === '' || body.startDate === undefined) {
             body.startDate = null; // Ensure empty strings or undefined become null
        }

        if (body.endDate && typeof body.endDate === 'string') {
            const parsedEndDate = new Date(body.endDate);
            // Check if the parsed date is valid
            body.endDate = !isNaN(parsedEndDate.getTime()) ? parsedEndDate : null;
             if (isNaN(parsedEndDate.getTime())) console.warn("Invalid end date string received:", body.endDate);
        } else if (body.endDate === '' || body.endDate === undefined) {
            body.endDate = null; // Ensure empty strings or undefined become null
        }
    } catch (dateError) {
        console.error("Error parsing dates before validation:", dateError);
        // Decide if this should be a hard error or just proceed with null dates
        body.startDate = null;
        body.endDate = null;
         // Potentially return a 400 error here if dates are critical and invalid format
        // return new NextResponse(JSON.stringify({ message: 'Invalid date format provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }


    console.log("Body after date preprocessing (POST):", JSON.stringify(body, null, 2));

    // Validate request body
    const parsedBody = taskCreateSchema.parse(body);
    console.log("Parsed body (POST):", JSON.stringify(parsedBody, null, 2));

    // Calculate estimated cost
    // Use || 0 to handle null/undefined laborCost safely
    const calculatedCost = (parsedBody.quantity * parsedBody.unitPrice) + (parsedBody.laborCost || 0);

    const newTaskData = {
      ...parsedBody,
      projectId: new mongoose.Types.ObjectId(parsedBody.projectId), // Convert string ID to ObjectId
      estimatedCost: calculatedCost, // Use calculated cost
      // Ensure null is saved if values are null/undefined in parsedBody, otherwise use parsed value
      profitMargin: parsedBody.profitMargin,
      laborCost: parsedBody.laborCost,
      estimatedDuration: parsedBody.estimatedDuration,
      executionPercentage: parsedBody.executionPercentage,
      // Dates should already be Date objects or null from preprocessing and validation
      startDate: parsedBody.startDate,
      endDate: parsedBody.endDate,
    };

    // Log the final data object just before sending to Mongoose
    console.log("Data for new task being sent to Mongoose (POST):", JSON.stringify(newTaskData, null, 2));

    const newTask = new Task(newTaskData);
    await newTask.save();

    console.log("Task created successfully (POST):", newTask);

    return NextResponse.json({ task: newTask }, { status: 201 }); // Return created task with 201 status

  } catch (error) {
    console.error('Error creating task (POST):', error);
    if (error instanceof z.ZodError) {
      console.error("Zod Validation Errors (POST):", error.errors);
      return new NextResponse(JSON.stringify({
        message: "Validation error",
        errors: error.errors
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    // Log the specific error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Detailed error message (POST):", errorMessage);

    return new NextResponse(JSON.stringify({
      message: 'Failed to create task.',
      error: errorMessage, // Send specific error message
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}


'use server';

import { NextResponse } from 'next/server';
import Task from '@/models/Task'; // Import the Task model
import connectDB from '@/lib/db'; // Import db connection utility
import mongoose from 'mongoose';
import { z } from 'zod';

// Schema for validating POST request body
const taskCreateSchema = z.object({
  projectId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), { message: "Invalid Project ID" }),
  phaseUUID: z.string().uuid({ message: "Invalid Phase UUID" }),
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().optional(),
  quantity: z.number().min(0, { message: "Quantity must be non-negative" }).default(1),
  unitOfMeasure: z.string().min(1, { message: "Unit of measure is required" }),
  unitPrice: z.number().min(0, { message: "Unit price must be non-negative" }).default(0),
  status: z.enum(['Pendiente', 'En Progreso', 'Realizado']).default('Pendiente'),
  profitMargin: z.number().optional().nullable(), // Allow null
  laborCost: z.number().min(0).optional().nullable(), // Allow null
  // estimatedCost is calculated, not directly taken from input usually
}).strict(); // Prevent extra fields from being passed

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
    console.log("Request body:", body);

    // Validate request body
    const parsedBody = taskCreateSchema.parse(body);
    console.log("Parsed body:", parsedBody);

    // Calculate estimated cost
    // Use || 0 to handle null/undefined laborCost safely
    const calculatedCost = (parsedBody.quantity * parsedBody.unitPrice) + (parsedBody.laborCost || 0);
    // Profit margin is not typically added to the base cost, but used for pricing/reporting

    const newTaskData = {
      ...parsedBody,
      projectId: new mongoose.Types.ObjectId(parsedBody.projectId), // Convert string ID to ObjectId
      estimatedCost: calculatedCost, // Use calculated cost
      // Ensure null is saved if values are null/undefined in parsedBody
      profitMargin: parsedBody.profitMargin === undefined ? null : parsedBody.profitMargin,
      laborCost: parsedBody.laborCost === undefined ? null : parsedBody.laborCost,
    };

    console.log("Data for new task:", newTaskData);

    const newTask = new Task(newTaskData);
    await newTask.save();

    console.log("Task created successfully:", newTask);

    return NextResponse.json({ task: newTask }, { status: 201 }); // Return created task with 201 status

  } catch (error) {
    console.error('Error creating task:', error);
    if (error instanceof z.ZodError) {
      console.error("Zod Validation Errors:", error.errors);
      return new NextResponse(JSON.stringify({
        message: "Validation error",
        errors: error.errors
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    return new NextResponse(JSON.stringify({
      message: 'Failed to create task.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

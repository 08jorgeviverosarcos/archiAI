'use server';

/**
 * @fileOverview API endpoint for generating an initial project plan with phases and tasks using GenAI,
 * and saving the Project, InitialPlan, and Tasks to MongoDB.
 */

import { generateInitialPlan, GenerateInitialPlanOutput } from '@/ai/flows/generate-initial-plan';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import Project from '@/models/Project';
import InitialPlan from '@/models/InitialPlan';
import Task from '@/models/Task'; // Import Task model
import connectDB from '@/lib/db';
import type { InitialPlanPhase as InitialPlanPhaseType } from '@/types'; // For frontend response type

const requestSchema = z.object({
  projectName: z.string().min(2),
  projectDescription: z.string().optional(),
  projectType: z.string(),
  projectLocation: z.string().optional(),
  totalBudget: z.number(),
  currency: z.string(),
  functionalRequirements: z.string().min(10),
  aestheticPreferences: z.string().optional(),
});

// Function to update phases in the InitialPlan document
async function updateInitialPlanPhases(planId: string, updatedPhases: InitialPlanPhaseType[]) {
  console.log(`Attempting to update InitialPlan phases for planId: ${planId}`);
  try {
    console.log("Connecting to DB for phase update...");
    await connectDB();
    console.log("DB connected for phase update.");

    const totalEstimatedCost = updatedPhases.reduce((sum, phase) => sum + phase.estimatedCost, 0);
    console.log(`Recalculated total estimated cost for update: ${totalEstimatedCost}`);

    const updateResult = await InitialPlan.findByIdAndUpdate(planId, {
      phases: updatedPhases.map((phase, index) => ({
        // Ensure we handle potential missing _id if it's a new phase added during edit
        _id: phase._id || new mongoose.Types.ObjectId(),
        phaseId: phase.phaseId || crypto.randomUUID(),
        phaseName: phase.phaseName,
        estimatedDuration: phase.estimatedDuration,
        estimatedCost: phase.estimatedCost,
        order: index + 1,
      })),
      totalEstimatedCost: totalEstimatedCost,
    }, { new: true, runValidators: true }); // Added options

    if (!updateResult) {
      console.error(`InitialPlan with ID ${planId} not found for update.`);
      throw new Error(`InitialPlan with ID ${planId} not found.`);
    }

    console.log('InitialPlan phases updated successfully in DB:', updateResult);

    // Update the Project's totalEstimatedCost as well
    const initialPlanDoc = await InitialPlan.findById(planId);
    if (initialPlanDoc) {
        console.log(`Updating Project ${initialPlanDoc.projectId} with new total cost.`);
        const projectUpdateResult = await Project.findByIdAndUpdate(initialPlanDoc.projectId, {
            totalEstimatedCost: totalEstimatedCost,
        }, { new: true }); // Added option
         if (!projectUpdateResult) {
            console.warn(`Project with ID ${initialPlanDoc.projectId} not found when updating total cost.`);
         } else {
            console.log(`Project ${initialPlanDoc.projectId} total cost updated.`);
         }
    } else {
         console.warn(`Could not find InitialPlan ${planId} after update to get projectId.`);
    }

  } catch (error) {
    console.error('Error updating InitialPlan phases:', error);
    throw error; // Re-throw to be handled by the main PUT handler
  }
  // No finally block for disconnect here, let the main handler manage it if needed.
}

export async function POST(req: Request) {
  console.log("POST /api/generate-plan initiated.");
  let dbConnected = false; // Flag to track connection status for finally block
  try {
    console.log("Connecting to DB...");
    await connectDB();
    dbConnected = true;
    console.log("DB Connected.");

    console.log("Parsing request body...");
    const body = await req.json();
    console.log("Raw request body:", body);
    const parsedBody = requestSchema.parse(body);
    console.log("Parsed request body:", parsedBody);

    console.log("Creating initial Project document...");
    const newProject = new Project({
      ...parsedBody,
      initialPlan: null,
      totalEstimatedCost: 0, // Initialize cost
    });
    await newProject.save();
    console.log('Project created successfully with ID:', newProject._id);

    console.log("Calling GenAI flow 'generateInitialPlan'...");
    // Wrap AI call in try-catch within the main try-catch for specific error logging
    let generatedPlanWithTasks: GenerateInitialPlanOutput;
    try {
        generatedPlanWithTasks = await generateInitialPlan(parsedBody);
        console.log("GenAI flow completed successfully. Plan data:", JSON.stringify(generatedPlanWithTasks, null, 2));
    } catch (aiError) {
        console.error("Error during GenAI plan generation:", aiError);
        throw new Error(`AI plan generation failed: ${aiError instanceof Error ? aiError.message : String(aiError)}`);
    }


    const phasesForDb: Omit<InitialPlanPhaseType, '_id' | 'tasks'>[] = [];
    const allTasksToSave: any[] = []; // To store Task documents for batch saving if desired

    let overallTotalEstimatedCost = 0;

    console.log("Processing generated phases and tasks...");
    for (const [phaseIndex, phaseData] of generatedPlanWithTasks.entries()) {
      console.log(`Processing phase ${phaseIndex + 1}: ${phaseData.phaseName}`);
      const phaseUUID = crypto.randomUUID();
      phasesForDb.push({
        phaseId: phaseUUID,
        phaseName: phaseData.phaseName,
        estimatedDuration: phaseData.estimatedDuration,
        estimatedCost: phaseData.estimatedCost,
        order: phaseIndex + 1,
      });
      overallTotalEstimatedCost += phaseData.estimatedCost;

      if (phaseData.tasks && phaseData.tasks.length > 0) {
        console.log(`Phase ${phaseData.phaseName} has ${phaseData.tasks.length} tasks. Preparing tasks for DB...`);
        for (const [taskIndex, taskData] of phaseData.tasks.entries()) {
          console.log(` - Preparing task ${taskIndex + 1}: ${taskData.taskName}`);
          const newTask = new Task({
            projectId: newProject._id,
            phaseUUID: phaseUUID, // Link task to the phase it belongs to
            title: taskData.taskName,
            description: '', // AI doesn't provide this yet
            quantity: 1, // Default
            unitOfMeasure: 'unidad', // Default, AI doesn't provide this. Could be 'global' or 'dia' depending on task
            unitPrice: taskData.estimatedCost, // Assuming AI cost is unit price for quantity 1
            estimatedDuration: taskData.estimatedDuration,
            status: 'Pendiente', // Default
            profitMargin: null, // Default
            laborCost: null, // Default, AI might not break this down
            estimatedCost: taskData.estimatedCost, // Direct from AI
            executionPercentage: 0, // Default
            startDate: null, // Default
            endDate: null, // Default
          });
          // await newTask.save(); // Save each task individually
          allTasksToSave.push(newTask.save()); // Add promise to array for batch saving
        }
      } else {
        console.log(`Phase ${phaseData.phaseName} has no tasks.`);
      }
    }
    console.log("Finished processing phases. Total estimated cost:", overallTotalEstimatedCost);

    // Batch save all tasks
    if (allTasksToSave.length > 0) {
        console.log(`Attempting to save ${allTasksToSave.length} tasks in parallel...`);
        await Promise.all(allTasksToSave);
        console.log(`${allTasksToSave.length} tasks created successfully.`);
    } else {
         console.log("No tasks to save.");
    }


    console.log("Creating InitialPlan document...");
    const newInitialPlan = new InitialPlan({
      projectId: newProject._id,
      phases: phasesForDb.map(p => ({ ...p, _id: new mongoose.Types.ObjectId() })), // Add _id to subdocuments
      totalEstimatedCost: overallTotalEstimatedCost,
    });
    await newInitialPlan.save();
    console.log('InitialPlan created successfully with ID:', newInitialPlan._id);

    console.log(`Updating Project ${newProject._id} with InitialPlan reference and total cost...`);
    await Project.findByIdAndUpdate(newProject._id, {
      initialPlan: newInitialPlan._id,
      totalEstimatedCost: overallTotalEstimatedCost,
    });
    console.log('Project updated successfully.');

    // Prepare response for the frontend, including tasks
    const responseData = {
        projectId: newProject._id.toString(),
        initialPlanId: newInitialPlan._id.toString(),
        // Return the structure as received from AI (phases with tasks) for frontend display
        initialPlan: generatedPlanWithTasks.map((phaseWithTasks, index) => ({
            ...phaseWithTasks,
            phaseId: phasesForDb[index].phaseId, // Ensure the UUID is included
            order: phasesForDb[index].order,
            // Add the MongoDB _id for the phase subdocument if needed by frontend, although phaseId (UUID) is usually preferred
            _id: newInitialPlan.phases[index]._id.toString()
        })),
        totalEstimatedCost: overallTotalEstimatedCost,
    };
    console.log("API call successful. Sending response:", responseData);
    return NextResponse.json(responseData);

  } catch (error: unknown) {
    // Enhanced error logging
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('!!! Critical Error in POST /api/generate-plan !!!');
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    if (error instanceof z.ZodError) {
      console.error('Zod Validation Error:', JSON.stringify(error.errors, null, 2));
      return new NextResponse(JSON.stringify({
        message: "Validation error",
        errors: error.errors
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    } else if (error instanceof mongoose.Error) {
        console.error('Mongoose Error:', error);
        return new NextResponse(JSON.stringify({
          message: 'Database operation failed.',
          error: error.message,
          name: error.name,
          // stack: process.env.NODE_ENV === 'development' ? error.stack : undefined, // Only show stack in dev
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    } else if (error instanceof Error) {
      console.error('Generic Error:', error.message);
      console.error('Stack Trace:', error.stack);
      return new NextResponse(JSON.stringify({
        message: 'Failed to generate initial plan with tasks. Please try again.',
        error: error.message,
        // stack: process.env.NODE_ENV === 'development' ? error.stack : undefined, // Only show stack in dev
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    } else {
      // Fallback for unknown error types
      console.error('Unknown Error:', error);
      return new NextResponse(JSON.stringify({
        message: 'An unexpected error occurred.',
        error: String(error),
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
    // Removed finally block for disconnect to rely on serverless function behavior
}

export async function PUT(req: Request) {
    console.log("PUT /api/generate-plan initiated.");
    let dbConnected = false;
    try {
      console.log("Connecting to DB for PUT...");
      await connectDB();
      dbConnected = true;
      console.log("DB Connected for PUT.");

      console.log("Parsing PUT request body...");
      const body = await req.json();
      console.log("Raw PUT request body:", body);

      // Basic validation for PUT request body
      if (!body.initialPlanId || !body.initialPlan || !Array.isArray(body.initialPlan)) {
         console.error("Invalid PUT request body:", body);
         return new NextResponse(JSON.stringify({
            message: "Initial Plan ID and a valid array of updated phases are required"
         }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const { initialPlanId, initialPlan: updatedPhases } = body;

      console.log(`Calling updateInitialPlanPhases for planId: ${initialPlanId}`);
      // The updateInitialPlanPhases function handles the DB operations
      await updateInitialPlanPhases(initialPlanId, updatedPhases as InitialPlanPhaseType[]);

      console.log(`Initial plan ${initialPlanId} updated successfully via PUT.`);
      return NextResponse.json({ message: 'Initial Plan updated successfully' });

    } catch (error: unknown) {
       console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
       console.error('!!! Critical Error in PUT /api/generate-plan !!!');
       console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
       const errorMessage = error instanceof Error ? error.message : String(error);
       console.error("Error details:", error);

       return new NextResponse(JSON.stringify({
         message: 'Failed to update initial plan. Please try again.',
         error: errorMessage,
         // stack: (process.env.NODE_ENV === 'development' && error instanceof Error) ? error.stack : undefined,
       }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
     // Removed finally block for disconnect
  }

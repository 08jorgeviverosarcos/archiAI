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
  try {
    await connectDB();

    const totalEstimatedCost = updatedPhases.reduce((sum, phase) => sum + phase.estimatedCost, 0);

    await InitialPlan.findByIdAndUpdate(planId, {
      phases: updatedPhases.map((phase, index) => ({
        phaseId: phase.phaseId || crypto.randomUUID(),
        phaseName: phase.phaseName,
        estimatedDuration: phase.estimatedDuration,
        estimatedCost: phase.estimatedCost,
        order: index + 1,
      })),
      totalEstimatedCost: totalEstimatedCost,
    });

    const initialPlanDoc = await InitialPlan.findById(planId);
    if (initialPlanDoc) {
        await Project.findByIdAndUpdate(initialPlanDoc.projectId, {
            totalEstimatedCost: totalEstimatedCost,
        });
    }

    console.log('InitialPlan phases updated successfully');
  } catch (error) {
    console.error('Error updating InitialPlan phases:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const parsedBody = requestSchema.parse(body);

    const newProject = new Project({
      ...parsedBody,
      initialPlan: null,
      totalEstimatedCost: 0,
    });
    await newProject.save();
    console.log('Project created successfully with ID:', newProject._id);

    // Call GenAI flow - this now returns phases with tasks
    const generatedPlanWithTasks = await generateInitialPlan(parsedBody);

    const phasesForDb: Omit<InitialPlanPhaseType, '_id' | 'tasks'>[] = [];
    const allTasksToSave: any[] = []; // To store Task documents for batch saving if desired

    let overallTotalEstimatedCost = 0;

    for (const [phaseIndex, phaseData] of generatedPlanWithTasks.entries()) {
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
        for (const taskData of phaseData.tasks) {
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
      }
    }

    // Batch save all tasks
    await Promise.all(allTasksToSave);
    console.log(`${allTasksToSave.length} tasks created successfully.`);

    const newInitialPlan = new InitialPlan({
      projectId: newProject._id,
      phases: phasesForDb,
      totalEstimatedCost: overallTotalEstimatedCost,
    });
    await newInitialPlan.save();
    console.log('InitialPlan created successfully with ID:', newInitialPlan._id);

    await Project.findByIdAndUpdate(newProject._id, {
      initialPlan: newInitialPlan._id,
      totalEstimatedCost: overallTotalEstimatedCost,
    });
    console.log('Project updated with InitialPlan reference and total cost.');

    // Prepare response for the frontend, including tasks
    const responseData = {
        projectId: newProject._id.toString(),
        initialPlanId: newInitialPlan._id.toString(),
        // Return the structure as received from AI (phases with tasks) for frontend display
        initialPlan: generatedPlanWithTasks.map((phaseWithTasks, index) => ({
            ...phaseWithTasks,
            phaseId: phasesForDb[index].phaseId, // Ensure the UUID is included
            order: phasesForDb[index].order,
        })),
        totalEstimatedCost: overallTotalEstimatedCost,
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error generating plan with tasks:', error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({
        message: "Validation error",
        errors: error.errors
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    return new NextResponse(JSON.stringify({
      message: 'Failed to generate initial plan with tasks. Please try again.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function PUT(req: Request) {
    try {
      await connectDB();

      const body = await req.json();
      // Assuming body for PUT contains initialPlanId and an array of InitialPlanPhaseType
      // If tasks are also editable via this route, the structure would need to include them.
      // For now, this PUT route is focused on updating phase details (name, duration, cost, order).
      // Task updates would typically go through their own API endpoints (e.g., /api/tasks/:taskId).
      const { initialPlanId, initialPlan: updatedPhases } = body;

      if (!initialPlanId || !updatedPhases || !Array.isArray(updatedPhases)) {
        return new NextResponse(JSON.stringify({
          message: "Initial Plan ID and a valid array of updated phases are required"
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      await updateInitialPlanPhases(initialPlanId, updatedPhases as InitialPlanPhaseType[]);

      // Note: If tasks were part of the update, you'd iterate through updatedPhases,
      // find their tasks, and update/create Task documents accordingly.
      // This could get complex and might be better handled by dedicated task management APIs.

      return NextResponse.json({ message: 'Initial Plan updated successfully' });

    } catch (error) {
      console.error('Error updating initial plan:', error);
      return new NextResponse(JSON.stringify({
        message: 'Failed to update initial plan. Please try again.',
        error: error instanceof Error ? error.message : String(error),
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

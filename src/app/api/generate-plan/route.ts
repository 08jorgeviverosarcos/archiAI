'use server';

/**
 * @fileOverview API endpoint for generating an initial project plan using GenAI
 * and saving the Project and its InitialPlan to MongoDB.
 */

import { generateInitialPlan, GenerateInitialPlanOutput } from '@/ai/flows/generate-initial-plan';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import Project from '@/models/Project'; // Import Project model
import InitialPlan from '@/models/InitialPlan'; // Import InitialPlan model
import connectDB from '@/lib/db'; // Import db connection utility

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
async function updateInitialPlanPhases(planId: string, updatedPhases: any) {
  try {
    await connectDB();

    const totalEstimatedCost = updatedPhases.reduce((sum: number, phase: any) => sum + phase.estimatedCost, 0);

    await InitialPlan.findByIdAndUpdate(planId, {
      phases: updatedPhases.map((phase: any, index: number) => ({ // Add index for order
        phaseId: phase.phaseId || crypto.randomUUID(), // Ensure phaseId exists
        phaseName: phase.phaseName,
        estimatedDuration: phase.estimatedDuration, // Use correct name from frontend
        estimatedCost: phase.estimatedCost,
        order: index + 1, // Assign order based on array index
      })),
      totalEstimatedCost: totalEstimatedCost,
      // Let mongoose handle updatedAt automatically
    });

    // Also update the totalEstimatedCost in the parent Project document
    const initialPlanDoc = await InitialPlan.findById(planId);
    if (initialPlanDoc) {
        await Project.findByIdAndUpdate(initialPlanDoc.projectId, {
            totalEstimatedCost: totalEstimatedCost,
        });
    }


    console.log('InitialPlan phases updated successfully');
  } catch (error) {
    console.error('Error updating InitialPlan phases:', error);
    throw error; // Re-throw to be caught by the main PUT handler
  }
  // No disconnect here, handle connection in the main route handlers
}

export async function POST(req: Request) {
  try {
    await connectDB(); // Connect to DB at the start of the request

    const body = await req.json();
    const parsedBody = requestSchema.parse(body);

    // 1. Create the Project document (without plan details initially)
    const newProject = new Project({
      ...parsedBody,
      initialPlan: null, // Will be linked later
      totalEstimatedCost: 0, // Initialize
      // Timestamps automatically added
    });
    await newProject.save();
    console.log('Project created successfully with ID:', newProject._id);

    // 2. Call the GenAI flow to generate the initial plan phases
    const generatedPhases = await generateInitialPlan(parsedBody);

    // 3. Calculate total estimated cost and add order
    const totalEstimatedCost = generatedPhases.reduce((sum, phase) => sum + phase.estimatedCost, 0);
    const phasesWithOrder = generatedPhases.map((phase, index) => ({
      phaseId: crypto.randomUUID(), // Generate UUID for frontend identification
      phaseName: phase.phaseName,
      estimatedDuration: phase.estimatedDuration, // Match schema
      estimatedCost: phase.estimatedCost,
      order: index + 1, // Assign order
    }));


    // 4. Create the InitialPlan document
    const newInitialPlan = new InitialPlan({
      projectId: newProject._id,
      phases: phasesWithOrder,
      totalEstimatedCost: totalEstimatedCost,
       // Timestamps automatically added
    });
    await newInitialPlan.save();
    console.log('InitialPlan created successfully with ID:', newInitialPlan._id);


    // 5. Update the Project document with the reference to the InitialPlan and total cost
    await Project.findByIdAndUpdate(newProject._id, {
      initialPlan: newInitialPlan._id,
      totalEstimatedCost: totalEstimatedCost,
       // Timestamps automatically updated
    });
    console.log('Project updated with InitialPlan reference and total cost.');

    // Prepare response for the frontend
    const responseData = {
        projectId: newProject._id.toString(), // Send project ID back
        initialPlanId: newInitialPlan._id.toString(), // Send initial plan ID back
        initialPlan: phasesWithOrder, // Send the structured phases
        totalEstimatedCost: totalEstimatedCost,
    };


    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error generating plan:', error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({
        message: "Validation error",
        errors: error.errors
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    // Handle other errors
    return new NextResponse(JSON.stringify({
      message: 'Failed to generate initial plan. Please try again.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  // No disconnect here, let the connection pool manage
}

// Handles updating an existing InitialPlan
export async function PUT(req: Request) {
    try {
      await connectDB(); // Connect to DB

      const body = await req.json();
      const { initialPlanId, initialPlan: updatedPhases } = body; // Expect initialPlanId now

      // Validate that initialPlanId and updatedPhases are provided
      if (!initialPlanId || !updatedPhases) {
        return new NextResponse(JSON.stringify({
          message: "Initial Plan ID and updated phases list are required"
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      // Update the phases in the specific InitialPlan document
      await updateInitialPlanPhases(initialPlanId, updatedPhases);

      return NextResponse.json({ message: 'Initial Plan updated successfully' });

    } catch (error) {
      console.error('Error updating initial plan:', error);
      return new NextResponse(JSON.stringify({
        message: 'Failed to update initial plan. Please try again.',
        error: error instanceof Error ? error.message : String(error),
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
     // No disconnect here
  }

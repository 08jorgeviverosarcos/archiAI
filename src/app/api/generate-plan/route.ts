'use server';

/**
 * @fileOverview API endpoint for generating an initial project plan using GenAI and saving it to MongoDB.
 *
 * This endpoint receives project details, interacts with Gemini to generate a plan,
 * and saves the plan with phase details and total estimated cost to MongoDB.
 */

import {generateInitialPlan} from '@/ai/flows/generate-initial-plan';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import mongoose from 'mongoose';

// Define the database connection URL
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/archiplandb';

// Define the project schema
const projectSchema = new mongoose.Schema({
  projectName: {type: String, required: true},
  projectDescription: {type: String},
  projectType: {type: String, required: true},
  projectLocation: {type: String},
  totalBudget: {type: Number, required: true},
  currency: {type: String, required: true},
  functionalRequirements: {type: String, required: true},
  aestheticPreferences: {type: String},
  initialPlan: {type: Array},
  totalEstimatedCost: {type: Number},
});

// Define the project model
const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);

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

// Function to insert phases into the database
async function insertPhases(projectId: string, initialPlan: any) {
  try {
    // Connect to the database
    await mongoose.connect(MONGODB_URI);

    // Update the project with the initial plan and total estimated cost
    await Project.findByIdAndUpdate(projectId, {
      initialPlan: initialPlan.map(phase => ({
        phaseId: phase.phaseId,
        phaseName: phase.phaseName,
        estimatedDurationDays: phase.estimatedDuration,
        estimatedCost: phase.estimatedCost,
      })),
      totalEstimatedCost: initialPlan.reduce((sum: number, phase: any) => sum + phase.estimatedCost, 0),
    });

    console.log('Phases inserted/updated successfully');
  } catch (error) {
    console.error('Error inserting/updating phases:', error);
    throw error;
  } finally {
    // Disconnect from the database
    await mongoose.disconnect();
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsedBody = requestSchema.parse(body);

    // Call the GenAI flow to generate the initial plan
    const initialPlan = await generateInitialPlan(parsedBody);

    // Transform the response to match the backend's expected format
    const transformedResponse = {
      initialPlan: initialPlan.map(phase => ({
        phaseId: crypto.randomUUID(), // Generate a UUID for each phase
        phaseName: phase.phaseName,
        estimatedDurationDays: phase.estimatedDuration,
        estimatedCost: phase.estimatedCost,
      })),
      totalEstimatedCost: initialPlan.reduce((sum, phase) => sum + phase.estimatedCost, 0),
    };

    // Connect to the database
    await mongoose.connect(MONGODB_URI);

    // Create a new project
    const project = new Project({
      ...parsedBody,
      initialPlan: transformedResponse.initialPlan,
      totalEstimatedCost: transformedResponse.totalEstimatedCost,
    });

    // Save the project to the database
    await project.save();

    console.log('Project saved successfully');

    return NextResponse.json({...transformedResponse, projectId: project._id});
  } catch (error) {
    console.error('Error generating plan:', error);
    if (error instanceof z.ZodError) {
      // Handle Zod validation errors
      return new NextResponse(JSON.stringify({
        message: "Validation error",
        errors: error.errors
      }), {status: 400});
    }
    // Handle other errors (e.g., Gemini API errors)
    return new NextResponse(JSON.stringify({
      message: 'Failed to generate initial plan. Please try again.',
      error: error instanceof Error ? error.message : String(error),
    }), {status: 500});
  } finally {
    // Disconnect from the database
    await mongoose.disconnect();
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {projectId, initialPlan} = body;

    // Validate that projectId and initialPlan are provided
    if (!projectId || !initialPlan) {
      return new NextResponse(JSON.stringify({
        message: "Project ID and initial plan are required"
      }), {status: 400});
    }

    // Insert phases into the database
    await insertPhases(projectId, initialPlan);

    return NextResponse.json({message: 'Phases updated successfully'});
  } catch (error) {
    console.error('Error updating phases:', error);
    return new NextResponse(JSON.stringify({
      message: 'Failed to update phases. Please try again.',
      error: error instanceof Error ? error.message : String(error),
    }), {status: 500});
  }
}

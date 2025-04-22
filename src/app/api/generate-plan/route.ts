'use server';

/**
 * @fileOverview API endpoint for generating an initial project plan using GenAI.
 *
 * This endpoint receives project details, interacts with Gemini to generate a plan,
 * and returns the plan with phase details and total estimated cost.
 */

import {generateInitialPlan} from '@/ai/flows/generate-initial-plan';
import {NextResponse} from 'next/server';
import {z} from 'zod';

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

    return NextResponse.json(transformedResponse);
  } catch (error) {
    console.error('Error generating plan:', error);
    if (error instanceof z.ZodError) {
      // Handle Zod validation errors
      return new NextResponse(JSON.stringify({
        message: "Validation error",
        errors: error.errors
      }), { status: 400 });
    }
    // Handle other errors (e.g., Gemini API errors)
    return new NextResponse(JSON.stringify({
      message: 'Failed to generate initial plan. Please try again.',
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500 });
  }
}

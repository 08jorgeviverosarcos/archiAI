// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview Generates an initial project plan based on project details using GenAI.
 *
 * - generateInitialPlan - A function that generates the initial project plan.
 * - GenerateInitialPlanInput - The input type for the generateInitialPlan function.
 * - GenerateInitialPlanOutput - The return type for the generateInitialPlan function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateInitialPlanInputSchema = z.object({
  projectName: z.string().describe('The name of the project.'),
  projectDescription: z.string().optional().describe('A description of the project.'),
  projectType: z.string().describe('The type of the project (e.g., New House, Renovation).'),
  projectLocation: z.string().optional().describe('The location of the project.'),
  totalBudget: z.number().describe('The total estimated budget for the project.'),
  currency: z.string().describe('The currency of the budget (e.g., COP, USD).'),
  functionalRequirements: z.string().describe('The main functional requirements of the project.'),
  aestheticPreferences: z.string().optional().describe('Aesthetic preferences for the project.'),
});

export type GenerateInitialPlanInput = z.infer<typeof GenerateInitialPlanInputSchema>;

const ProjectPhaseSchema = z.object({
  phaseName: z.string().describe('The name of the project phase.'),
  estimatedDuration: z.number().describe('The estimated duration of the phase in days.'),
  estimatedCost: z.number().describe('The estimated cost of the phase.'),
});

const GenerateInitialPlanOutputSchema = z.array(ProjectPhaseSchema).describe('An array of project phases with estimated durations and costs.');

export type GenerateInitialPlanOutput = z.infer<typeof GenerateInitialPlanOutputSchema>;

export async function generateInitialPlan(input: GenerateInitialPlanInput): Promise<GenerateInitialPlanOutput> {
  return generateInitialPlanFlow(input);
}

const initialPlanPrompt = ai.definePrompt({
  name: 'initialPlanPrompt',
  input: {
    schema: GenerateInitialPlanInputSchema,
  },
  output: {
    schema: GenerateInitialPlanOutputSchema,
  },
  prompt: `You are an expert construction project planner. Generate an initial project plan with phases, estimated durations (in days), and high-level costs, based on the following project details.

Project Type: {{{projectType}}}
Functional Requirements: {{{functionalRequirements}}}
Total Budget: {{{totalBudget}}} {{{currency}}}
{{#if projectDescription}}
Description: {{{projectDescription}}}
{{/if}}
{{#if aestheticPreferences}}
Aesthetic Preferences: {{{aestheticPreferences}}}
{{/if}}

Respond in JSON format with an array of project phases. Each phase should include a phaseName, estimatedDuration, and estimatedCost.
`,
});

const generateInitialPlanFlow = ai.defineFlow<
  typeof GenerateInitialPlanInputSchema,
  typeof GenerateInitialPlanOutputSchema
>(
  {
    name: 'generateInitialPlanFlow',
    inputSchema: GenerateInitialPlanInputSchema,
    outputSchema: GenerateInitialPlanOutputSchema,
  },
  async input => {
    const {output} = await initialPlanPrompt(input);
    return output!;
  }
);

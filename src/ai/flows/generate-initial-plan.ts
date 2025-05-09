// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview Generates an initial project plan with phases and tasks based on project details using GenAI.
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

const TaskSchema = z.object({
  taskName: z.string().describe('The name of the task.'),
  estimatedDuration: z.number().describe('The estimated duration of the task in days. Be realistic.'),
  estimatedCost: z.number().describe('The estimated cost of the task. Be realistic.'),
  // Add other task-related fields if the AI should generate them, e.g., materials, specific skills needed.
  // For now, keeping it simple.
});

const ProjectPhaseWithTasksSchema = z.object({
  phaseName: z.string().describe('The name of the project phase.'),
  estimatedDuration: z.number().describe('The estimated total duration of the phase in days. This should roughly align with the sum of its tasks durations, considering potential parallelism.'),
  estimatedCost: z.number().describe('The estimated total cost of the phase. This should be the sum of its tasks costs.'),
  tasks: z.array(TaskSchema).describe('A list of detailed tasks required to complete this phase. Provide at least 2-5 tasks per phase.'),
});

const GenerateInitialPlanOutputSchema = z.array(ProjectPhaseWithTasksSchema).describe('An array of project phases, each with estimated durations, costs, and a list of detailed tasks.');

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
  prompt: `Eres un experto en planificación de proyectos de construcción. Genera un plan de proyecto inicial detallado.
El plan debe consistir en un array de FASES.
Cada FASE debe incluir:
- phaseName: El nombre de la fase (ej. "Cimentación", "Estructura", "Acabados Interiores").
- estimatedDuration: La duración total estimada de la fase en días.
- estimatedCost: El costo total estimado de la fase en {{{currency}}}.
- tasks: Un array de TAREAS específicas y detalladas necesarias para completar esta fase. Debes generar entre 2 y 5 tareas significativas por cada fase.

Cada TAREA dentro de una fase debe incluir:
- taskName: El nombre de la tarea (ej. "Excavación para cimientos", "Instalación de tuberías sanitarias", "Pintura de muros").
- estimatedDuration: La duración estimada de la tarea en días.
- estimatedCost: El costo estimado de la tarea en {{{currency}}}.

Considera los siguientes detalles del proyecto para generar el plan:
Nombre del Proyecto: {{{projectName}}}
Tipo de Proyecto: {{{projectType}}}
Requisitos Funcionales: {{{functionalRequirements}}}
Presupuesto Total: {{{totalBudget}}} {{{currency}}}
{{#if projectDescription}}
Descripción del Proyecto: {{{projectDescription}}}
{{/if}}
{{#if projectLocation}}
Ubicación del Proyecto: {{{projectLocation}}}
{{/if}}
{{#if aestheticPreferences}}
Preferencias Estéticas: {{{aestheticPreferences}}}
{{/if}}

Asegúrate de que:
1. La suma de los 'estimatedCost' de las tareas dentro de una fase sea igual al 'estimatedCost' de esa fase.
2. La suma de las 'estimatedDuration' de las tareas dentro de una fase (considerando que algunas pueden ser secuenciales) contribuya a la 'estimatedDuration' de la fase. (Para simplificar, puedes hacer que la duración de la fase sea la suma de las duraciones de sus tareas si son mayormente secuenciales, o un valor menor si hay mucho paralelismo).
3. El costo total de todas las fases combinadas debe intentar aproximarse lo más posible al 'totalBudget' del proyecto, sin excederlo idealmente. Si el presupuesto es demasiado bajo para los requisitos, ajústalo de manera realista.
4. Los nombres de las fases y tareas deben estar en español. Las duraciones y costos deben ser números.

Responde únicamente en formato JSON que cumpla con el schema de salida especificado.
Output schema:
${JSON.stringify(GenerateInitialPlanOutputSchema.openapi('GenerateInitialPlanOutputSchema'), null, 2)}
`,
});


const generateInitialPlanFlow = ai.defineFlow<
  typeof GenerateInitialPlanInputSchema,
  typeof GenerateInitialPlanOutputSchema // Output schema now includes tasks
>(
  {
    name: 'generateInitialPlanFlow',
    inputSchema: GenerateInitialPlanInputSchema,
    outputSchema: GenerateInitialPlanOutputSchema,
  },
  async input => {
    const {output} = await initialPlanPrompt(input);
    // Validate that output is not null and conforms to the schema.
    // The definePrompt with an output schema should handle this, but an extra check can be useful.
    if (!output) {
        throw new Error("AI did not return a valid plan structure.");
    }
    // Further validation could be added here if needed, e.g., checking task cost sums up to phase cost.
    return output;
  }
);

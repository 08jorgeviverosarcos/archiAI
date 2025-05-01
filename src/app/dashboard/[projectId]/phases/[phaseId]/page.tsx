'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InitialPlan } from '@/types'; // Assuming InitialPlan defines the phase structure

// Placeholder data/types for Tasks and Materials (replace with actual types)
interface Material {
    _id?: string;
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
}

interface Task {
    _id?: string;
    name: string;
    responsible?: string; // Optional for MVP
    estimatedDuration: number; // Days
    materials: Material[];
    status: 'Pendiente' | 'En Progreso' | 'Completada' | 'Aprobado por Cliente' | 'No Aprobado por Cliente';
    // Add other fields later: realDuration, realCost, clientApproved, profitMargin, laborCost
}

export default function PhaseTasksPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;
    const phaseId = params.phaseId as string; // This is the phaseId (UUID) from our InitialPlan phase
    const { toast } = useToast();

    const [phaseDetails, setPhaseDetails] = useState<InitialPlan | null>(null); // To store phase name etc.
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPhaseData = async () => {
             if (!projectId || !phaseId) return;
             setIsLoading(true);
             setError(null);
             try {
                 // --- How to get Phase Details & Tasks ---
                 // Option 1: Fetch the entire Project/InitialPlan again and filter
                 // Option 2: Create a new API endpoint `/api/projects/${projectId}/phases/${phaseId}/tasks`
                 // Option 3 (Simpler for now): Fetch InitialPlan and find the phase. Tasks would need another fetch or be embedded.

                 // Let's assume we fetch the InitialPlan and find the phase name for now
                 // We'll need a separate fetch/API for tasks later.
                 const projectRes = await fetch(`/api/projects/${projectId}`);
                 if (!projectRes.ok) throw new Error("Failed to fetch project");
                 const projectData = await projectRes.json();

                 if (projectData.project?.initialPlanId) {
                    const planRes = await fetch(`/api/initial-plans/${projectData.project.initialPlanId}`);
                    if (!planRes.ok) {
                         if (planRes.status !== 404) throw new Error("Failed to fetch initial plan");
                         // Plan not found is ok here, phase won't be found either
                    } else {
                         const planData = await planRes.json();
                         const foundPhase = planData.initialPlan?.phases?.find((p: InitialPlan) => p.phaseId === phaseId);
                         if (foundPhase) {
                             setPhaseDetails(foundPhase);
                         } else {
                             throw new Error(`Phase with ID ${phaseId} not found in project ${projectId}`);
                         }
                         // TODO: Fetch tasks associated with this phaseId separately
                         setTasks([]); // Placeholder - fetch tasks here
                    }
                 } else {
                     throw new Error("Project does not have an initial plan associated.");
                 }

             } catch (err: any) {
                 console.error("Error loading phase tasks:", err);
                 setError(`Could not load tasks for phase: ${err.message}`);
                 toast({
                    variant: "destructive",
                    title: "Error",
                    description: "No se pudieron cargar las tareas de la fase.",
                });
                 // Maybe redirect back to dashboard if phase load fails
                 // router.push(`/dashboard/${projectId}`);
             } finally {
                 setIsLoading(false);
             }
         };

         fetchPhaseData();
    }, [projectId, phaseId, router, toast]);


    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

     if (error || !phaseDetails) {
        return (
            <div className="container mx-auto p-4 md:p-8 text-center">
                 <p className="text-destructive mb-4">{error || 'Detalles de la fase no encontrados.'}</p>
                <Button variant="outline" onClick={() => router.push(`/dashboard/${projectId}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-6">
             <div className="flex justify-between items-center mb-4">
                 <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/${projectId}`)} className="mb-2">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
                    </Button>
                     <h1 className="text-2xl font-bold">Gestión de Tareas: {phaseDetails.phaseName}</h1>
                     <p className="text-muted-foreground">Administra las tareas específicas para completar esta fase.</p>
                 </div>
                 <Button>
                     <PlusCircle className="mr-2 h-4 w-4" /> Agregar Tarea
                 </Button>
            </div>

            {/* Task List Area - Placeholder */}
            <div className="p-4 border rounded bg-muted min-h-[300px] flex items-center justify-center text-muted-foreground">
                 Lista de Tareas (Próximamente) - Aquí se mostrarán y gestionarán las tareas de la fase "{phaseDetails.phaseName}".
            </div>

             {/* Add Task Form / Modal - Placeholder */}
             {/* <AddTaskForm phaseId={phaseId} projectId={projectId} /> */}

        </div>
    );
}

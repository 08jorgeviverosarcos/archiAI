
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProjectDetails, InitialPlan as InitialPlanType } from '@/types'; // Use specific type for plan phases
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, GanttChartSquare, ListTodo, Settings, DollarSign } from 'lucide-react'; // Icons
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

// Placeholder components - replace with actual implementations
const GanttChartPlaceholder = () => <div className="p-4 border rounded bg-muted h-64 flex items-center justify-center text-muted-foreground">Diagrama de Gantt (Próximamente)</div>;
const BudgetSummaryPlaceholder = () => <div className="p-4 border rounded bg-muted flex items-center justify-center text-muted-foreground">Resumen de Presupuesto (Próximamente)</div>;
const PhaseListPlaceholder = () => <div className="p-4 border rounded bg-muted flex items-center justify-center text-muted-foreground">Lista de Fases (Próximamente)</div>;


export default function ProjectDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;
    const { toast } = useToast();

    const [project, setProject] = useState<ProjectDetails | null>(null);
    const [initialPlanPhases, setInitialPlanPhases] = useState<InitialPlanType[] | null>(null); // State specifically for phases array
    const [initialPlanTotalCost, setInitialPlanTotalCost] = useState<number | null>(null); // State for plan's total cost
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProjectData = async () => {
            if (!projectId) return;
            setIsLoading(true);
            setError(null);
            setInitialPlanPhases(null); // Reset plan phases on new load
            setInitialPlanTotalCost(null); // Reset plan cost
            try {
                // 1. Fetch Project Details
                console.log(`Fetching project details for ID: ${projectId}`);
                const projectRes = await fetch(`/api/projects/${projectId}`);
                console.log(`Project details response status: ${projectRes.status}`);
                if (!projectRes.ok) {
                    let errorMsg = 'Failed to fetch project details';
                    try {
                        const errorData = await projectRes.json();
                        errorMsg = errorData.message || errorMsg;
                    } catch (e) {/* ignore */}
                    throw new Error(errorMsg);
                }
                const projectData = await projectRes.json();
                console.log('Fetched project data:', projectData);
                setProject(projectData.project);

                // 2. Fetch Initial Plan using projectId
                console.log(`Fetching initial plan details using project ID: ${projectId}`);
                // The API route now uses the project ID as the parameter
                const planRes = await fetch(`/api/initial-plans/${projectId}`);
                console.log(`Initial plan response status: ${planRes.status}`);
                if (!planRes.ok) {
                    if (planRes.status === 404) {
                        console.warn(`Initial plan not found for project ${projectId}`);
                        setInitialPlanPhases(null); // No plan available
                        setInitialPlanTotalCost(0); // Assume 0 cost if no plan
                        toast({
                            variant: "default",
                            title: "Planificación No Encontrada",
                            description: "Este proyecto no tiene una planificación inicial detallada aún.",
                        });
                    } else {
                        let errorMsg = 'Failed to fetch initial plan';
                        try {
                            const errorData = await planRes.json();
                            errorMsg = errorData.message || errorMsg;
                        } catch (e) {/* ignore */}
                        throw new Error(errorMsg);
                    }
                } else {
                    const planData = await planRes.json();
                    console.log('Fetched initial plan data:', planData);
                    // Ensure planData.initialPlan exists and has a phases array
                    if (planData && planData.initialPlan && Array.isArray(planData.initialPlan.phases)) {
                        // Sort phases by order before setting state
                        const sortedPhases = [...planData.initialPlan.phases].sort((a, b) => Number(a.order) - Number(b.order));
                        setInitialPlanPhases(sortedPhases);
                        setInitialPlanTotalCost(planData.initialPlan.totalEstimatedCost || 0); // Get total cost from plan
                        console.log("Successfully set initial plan state with sorted phases:", sortedPhases);
                    } else {
                        console.warn(`Initial plan data for project ${projectId} is missing structure or phases.`, planData);
                        setInitialPlanPhases(null); // Set to null if structure is wrong
                        setInitialPlanTotalCost(0);
                    }
                }

            } catch (err: any) {
                console.error("Error loading dashboard:", err);
                setError(`Could not load project data: ${err.message}`);
                 toast({
                    variant: "destructive",
                    title: "Error",
                    description: `No se pudieron cargar los datos del proyecto: ${err.message}`,
                });
                 // Optional: Redirect back if project load fails fundamentally
                 // router.push('/');
            } finally {
                setIsLoading(false);
                console.log("Finished fetching dashboard data.");
            }
        };

        fetchProjectData();
    }, [projectId, router, toast]); // Dependencies

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                 <span className="ml-2">Cargando dashboard...</span>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="container mx-auto p-4 md:p-8 text-center">
                <p className="text-destructive mb-4">{error || 'Proyecto no encontrado.'}</p>
                <Button variant="outline" onClick={() => router.push('/')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Proyectos
                </Button>
            </div>
        );
    }

    // Determine if plan cost exceeds project budget
    const budgetExceeded = initialPlanTotalCost !== null && project.totalBudget !== null && initialPlanTotalCost > project.totalBudget;


    return (
        <div className="container mx-auto p-4 md:p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{project.projectName}</h1>
                <Button variant="outline" size="sm" onClick={() => router.push('/')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Proyectos
                </Button>
            </div>
            <CardDescription>{project.projectType} - {project.projectLocation || 'Ubicación no especificada'}</CardDescription>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gantt Chart Area (Col span 2) */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><GanttChartSquare className="h-5 w-5 text-primary"/>Cronograma General</CardTitle>
                        <CardDescription>Vista general de las fases del proyecto.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <GanttChartPlaceholder />
                    </CardContent>
                </Card>

                {/* Budget Summary Area */}
                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-600"/>Resumen de Presupuesto</CardTitle>
                         <CardDescription>Comparación de presupuesto y costos estimados.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm mb-4">
                            <div className="flex justify-between">
                                <span>Presupuesto Total:</span>
                                <span className="font-medium">{project.totalBudget?.toLocaleString() || 'N/A'} {project.currency}</span>
                            </div>
                             <div className="flex justify-between">
                                <span>Costo Estimado (Plan):</span>
                                <span className={`font-medium ${budgetExceeded ? 'text-destructive' : ''}`}>
                                    {/* Display cost from fetched plan's total cost */}
                                    {(initialPlanTotalCost ?? 0).toLocaleString() || 'N/A'} {project.currency}
                                </span>
                            </div>
                             {/* Add more budget details later */}
                        </div>
                        {/* Placeholder can be removed when real budget component is ready */}
                        {/* <BudgetSummaryPlaceholder /> */}
                    </CardContent>
                </Card>

                 {/* Phase List Area */}
                <Card className="lg:col-span-3"> {/* Full width on large screens */}
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5 text-blue-600"/>Fases del Proyecto</CardTitle>
                         <CardDescription>Haz clic en una fase para gestionar sus tareas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {initialPlanPhases && initialPlanPhases.length > 0 ? (
                            <div className="space-y-2">
                                {initialPlanPhases.map(phase => (
                                    <Button
                                        key={phase.phaseId} // Use unique phaseId from plan
                                        variant="outline"
                                        className="w-full justify-start"
                                         onClick={() => router.push(`/dashboard/${projectId}/phases/${phase.phaseId}`)} // Navigate to phase detail using phaseId
                                    >
                                        {phase.phaseName} ({phase.estimatedDuration} días - {phase.estimatedCost.toLocaleString()} {project.currency})
                                        {/* Add status indicator later */}
                                    </Button>
                                ))}
                            </div>
                         ) : !isLoading ? ( // Only show message if not loading and plan is empty/null
                            <p className="text-muted-foreground italic">No hay fases definidas en la planificación inicial para este proyecto.</p>
                         ) : null /* Don't show anything while loading */}
                         {/* Remove placeholder when list is populated */}
                         {/* {(!initialPlanPhases || initialPlanPhases.length === 0) && <PhaseListPlaceholder />} */}
                    </CardContent>
                </Card>

                {/* Project Settings Area (Optional) */}
                 {/*
                 <Card>
                     <CardHeader>
                         <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-gray-600"/>Configuración</CardTitle>
                         <CardDescription>Gestionar detalles del proyecto.</CardDescription>
                     </CardHeader>
                     <CardContent>
                         <Button variant="secondary" size="sm">Editar Proyecto</Button>
                     </CardContent>
                 </Card>
                 */}

            </div>
        </div>
    );
}

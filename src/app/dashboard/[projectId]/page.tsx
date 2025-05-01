'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProjectDetails, InitialPlan as InitialPlanType } from '@/types';
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
    const [initialPlan, setInitialPlan] = useState<InitialPlanType[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProjectData = async () => {
            if (!projectId) return;
            setIsLoading(true);
            setError(null);
            try {
                // Fetch Project Details
                const projectRes = await fetch(`/api/projects/${projectId}`); // Need API endpoint for single project
                if (!projectRes.ok) {
                    throw new Error('Failed to fetch project details');
                }
                const projectData = await projectRes.json();
                setProject(projectData.project);

                // Fetch Initial Plan if linked
                if (projectData.project?.initialPlanId) {
                    const planRes = await fetch(`/api/initial-plans/${projectData.project.initialPlanId}`);
                     if (!planRes.ok) {
                        if (planRes.status === 404) {
                             console.warn(`Initial plan not found for project ${projectId}`);
                             setInitialPlan(null); // No plan available
                        } else {
                            throw new Error('Failed to fetch initial plan');
                        }
                     } else {
                        const planData = await planRes.json();
                        setInitialPlan(planData.initialPlan?.phases || null);
                     }
                } else {
                    setInitialPlan(null); // No plan linked
                }

            } catch (err: any) {
                console.error("Error loading dashboard:", err);
                setError('Could not load project data.');
                 toast({
                    variant: "destructive",
                    title: "Error",
                    description: "No se pudieron cargar los datos del proyecto.",
                });
                 // Redirect back if project load fails fundamentally
                 // router.push('/');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjectData();
    }, [projectId, router, toast]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Presupuesto Total:</span>
                                <span className="font-medium">{project.totalBudget?.toLocaleString() || 'N/A'} {project.currency}</span>
                            </div>
                             <div className="flex justify-between">
                                <span>Costo Estimado (Plan):</span>
                                <span className="font-medium">{project.totalEstimatedCost?.toLocaleString() || 'N/A'} {project.currency}</span>
                            </div>
                             {/* Add more budget details later */}
                        </div>
                        <BudgetSummaryPlaceholder />
                    </CardContent>
                </Card>

                 {/* Phase List Area */}
                <Card className="lg:col-span-3"> {/* Full width on large screens */}
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5 text-blue-600"/>Fases del Proyecto</CardTitle>
                         <CardDescription>Haz clic en una fase para gestionar sus tareas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {initialPlan && initialPlan.length > 0 ? (
                            <div className="space-y-2">
                                {initialPlan.map(phase => (
                                    <Button
                                        key={phase.phaseId}
                                        variant="outline"
                                        className="w-full justify-start"
                                         onClick={() => router.push(`/dashboard/${projectId}/phases/${phase.phaseId}`)} // Navigate to phase detail
                                    >
                                        {phase.phaseName}
                                        {/* Add status indicator later */}
                                    </Button>
                                ))}
                            </div>
                         ) : (
                            <p className="text-muted-foreground italic">No hay fases definidas en la planificación inicial.</p>
                         )}
                        <PhaseListPlaceholder /> {/* Remove later */}
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

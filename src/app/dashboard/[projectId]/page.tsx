
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { ProjectDetails, InitialPlanPhase } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, GanttChartSquare, ListTodo, Settings, DollarSign, Edit, Package, Home, LayoutDashboard, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import {
    SidebarProvider,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarTrigger,
    SidebarInset,
    SidebarFooter,
} from '@/components/ui/sidebar';

// Placeholder components - replace with actual implementations
const GanttChartPlaceholder = () => <div className="p-4 border rounded bg-muted h-64 flex items-center justify-center text-muted-foreground">Diagrama de Gantt (Próximamente)</div>;


export default function ProjectDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;
    const { toast } = useToast();

    const [project, setProject] = useState<ProjectDetails | null>(null);
    const [initialPlanPhases, setInitialPlanPhases] = useState<InitialPlanPhase[] | null>(null);
    const [initialPlanId, setInitialPlanId] = useState<string | null>(null);
    const [initialPlanTotalCost, setInitialPlanTotalCost] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProjectData = async () => {
            if (!projectId) return;
            setIsLoading(true);
            setError(null);
            setInitialPlanPhases(null);
            setInitialPlanTotalCost(null);
            setInitialPlanId(null);
            try {
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

                console.log(`Fetching initial plan details using project ID: ${projectId}`);
                const planRes = await fetch(`/api/initial-plans/${projectId}`);
                console.log(`Initial plan response status: ${planRes.status}`);
                if (!planRes.ok) {
                    if (planRes.status === 404) {
                        console.warn(`Initial plan not found for project ${projectId}`);
                        setInitialPlanPhases(null);
                        setInitialPlanTotalCost(0);
                        setInitialPlanId(null);
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
                    if (planData && planData.initialPlan && Array.isArray(planData.initialPlan.phases)) {
                        setInitialPlanId(planData.initialPlan._id);
                        const sortedPhases = [...planData.initialPlan.phases].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
                        setInitialPlanPhases(sortedPhases);
                        setInitialPlanTotalCost(planData.initialPlan.totalEstimatedCost || 0);
                        console.log("Successfully set initial plan state with sorted phases:", sortedPhases);
                    } else {
                        console.warn(`Initial plan data for project ${projectId} is missing structure or phases.`, planData);
                        setInitialPlanPhases(null);
                        setInitialPlanTotalCost(0);
                        setInitialPlanId(null);
                    }
                }

            } catch (err: any) {
                console.error("Error loading dashboard:", err);
                setError(`No se pudieron cargar los datos del proyecto: ${err.message}`);
                 toast({
                    variant: "destructive",
                    title: "Error",
                    description: `No se pudieron cargar los datos del proyecto: ${err.message}`,
                });
            } finally {
                setIsLoading(false);
                console.log("Finished fetching dashboard data.");
            }
        };

        fetchProjectData();
     // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, toast]);

    const handleEditPlan = () => {
        if (initialPlanId && project?._id) {
             router.push(`/?edit=${project._id}&planId=${initialPlanId}`);
        } else if (project?._id) {
            router.push(`/?edit=${project._id}`);
            toast({
                title: "Redirigiendo a Edición",
                description: "No se encontró una planificación inicial, puedes crear una ahora."
            })
        }
         else {
             toast({
                 variant: "destructive",
                 title: "Error",
                 description: "No se puede editar el plan, falta información del proyecto o del plan.",
             });
        }
    };


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
            <SidebarProvider>
                <SidebarInset>
                     <div className="container mx-auto p-4 md:p-8 text-center">
                        <div className="md:hidden mb-4 flex justify-start">
                           <SidebarTrigger />
                        </div>
                        <p className="text-destructive mb-4">{error || 'Proyecto no encontrado.'}</p>
                        <Button variant="outline" onClick={() => router.push('/')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Proyectos
                        </Button>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        );
    }

    const budgetExceeded = initialPlanTotalCost !== null && project.totalBudget !== null && initialPlanTotalCost > project.totalBudget;

    return (
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="justify-start text-sidebar-foreground hover:text-sidebar-accent-foreground">
                        <Home className="mr-2 h-4 w-4" />
                        Proyectos
                    </Button>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => router.push(`/dashboard/${projectId}`)} isActive={true}>
                                <LayoutDashboard />
                                Dashboard
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                             <SidebarMenuButton onClick={() => router.push(`/dashboard/${projectId}/materials`)}>
                                <Package />
                                Gestionar Materiales
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton disabled> {/* Placeholder */}
                                <DollarSign />
                                Presupuesto
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton disabled> {/* Placeholder */}
                                <ClipboardList />
                                Seguimiento Tareas
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter>
                    {/* Optional: Add footer content like user profile, settings, logout */}
                </SidebarFooter>
            </Sidebar>
            <SidebarInset>
                <div className="container mx-auto p-4 md:p-8 space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                             <div className="md:hidden">
                                 <SidebarTrigger />
                             </div>
                            <h1 className="text-3xl font-bold">{project.projectName}</h1>
                        </div>
                    </div>
                    <CardDescription>{project.projectType} - {project.projectLocation || 'Ubicación no especificada'}</CardDescription>

                     <div className="flex justify-end space-x-2">
                         <Button variant="secondary" size="sm" onClick={handleEditPlan}>
                             <Edit className="mr-2 h-4 w-4" /> Editar Planificación Inicial
                         </Button>
                     </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><GanttChartSquare className="h-5 w-5 text-primary"/>Cronograma General</CardTitle>
                                <CardDescription>Vista general de las fases del proyecto.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <GanttChartPlaceholder />
                            </CardContent>
                        </Card>

                        <Card>
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-600"/>Resumen de Presupuesto</CardTitle>
                                 <CardDescription>Comparación de presupuesto y costos estimados.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm mb-4">
                                    <div className="flex justify-between">
                                        <span>Presupuesto Total:</span>
                                        <span className="font-medium">{(project.totalBudget ?? 0).toLocaleString()} {project.currency}</span>
                                    </div>
                                     <div className="flex justify-between">
                                        <span>Costo Estimado (Plan):</span>
                                        <span className={`font-medium ${budgetExceeded ? 'text-destructive' : ''}`}>
                                            {(initialPlanTotalCost ?? 0).toLocaleString()} {project.currency}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-3">
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5 text-blue-600"/>Fases del Proyecto</CardTitle>
                                 <CardDescription>Haz clic en una fase para gestionar sus tareas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                 {initialPlanPhases && initialPlanPhases.length > 0 ? (
                                    <div className="space-y-2">
                                        {initialPlanPhases.map(phase => (
                                            <Button
                                                key={phase.phaseId}
                                                variant="outline"
                                                className="w-full justify-start"
                                                 onClick={() => router.push(`/dashboard/${projectId}/phases/${phase.phaseId}/tasks`)}
                                            >
                                                {phase.phaseName} ({phase.estimatedDuration} días - {(phase.estimatedCost ?? 0).toLocaleString()} {project.currency})
                                            </Button>
                                        ))}
                                    </div>
                                 ) : !isLoading ? ( 
                                    <p className="text-muted-foreground italic">No hay fases definidas en la planificación inicial para este proyecto.</p>
                                 ) : null }
                            </CardContent>
                        </Card>

                    </div>
                     <Toaster />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}


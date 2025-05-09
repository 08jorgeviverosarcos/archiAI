'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, PlusCircle, Trash2, Edit, PackagePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { InitialPlanPhase, Task } from '@/types'; // Use type alias
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TaskForm } from '@/components/TaskForm';
import { AssignMaterialToTaskDialog } from '@/components/AssignMaterialToTaskDialog'; // Import the new dialog
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Toaster } from '@/components/ui/toaster';


export default function PhaseTasksPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;
    const phaseId = params.phaseId as string; // This is phaseUUID
    const { toast } = useToast();

    const [phaseDetails, setPhaseDetails] = useState<InitialPlanPhase | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const [selectedTaskForMaterials, setSelectedTaskForMaterials] = useState<Task | null>(null);
    const [isAssignMaterialDialogOpen, setIsAssignMaterialDialogOpen] = useState(false);

    const fetchPhaseData = useCallback(async () => {
        if (!projectId || !phaseId) return;
        console.log(`Fetching data for projectId: ${projectId}, phaseId (phaseUUID): ${phaseId}`);
        setIsLoading(true);
        setError(null);
        try {
            // Fetch the initial plan which should now contain populated tasks for each phase
            const planRes = await fetch(`/api/initial-plans/${projectId}`);
            if (!planRes.ok) {
                if (planRes.status === 404) {
                    throw new Error("Planificación inicial no encontrada para este proyecto.");
                }
                let errorMsg = "Fallo al cargar la planificación inicial.";
                try {
                    const errorData = await planRes.json();
                    errorMsg = errorData.message || errorMsg;
                } catch (e) {/* ignore */}
                throw new Error(errorMsg);
            }
            const planData = await planRes.json();

            if (!planData.initialPlan || !Array.isArray(planData.initialPlan.phases)) {
                throw new Error("La estructura de la planificación inicial es inválida o no contiene fases.");
            }

            // Find the specific phase using phaseId (which is phaseUUID)
            const foundPhase = planData.initialPlan.phases.find((p: InitialPlanPhase) => p.phaseId === phaseId);

            if (foundPhase) {
                setPhaseDetails(foundPhase);
                // Tasks are now expected to be part of foundPhase.tasks, populated by the backend
                setTasks(foundPhase.tasks || []);
                console.log(`Phase "${foundPhase.phaseName}" found with ${foundPhase.tasks?.length || 0} tasks.`);
            } else {
                throw new Error(`Fase con UUID ${phaseId} no encontrada en la planificación del proyecto ${projectId}`);
            }

        } catch (err: any) {
            console.error("Error loading phase tasks page:", err);
            setError(`${err.message}`);
            setPhaseDetails(null);
            setTasks([]);
            toast({
                variant: "destructive",
                title: "Error",
                description: `${err.message}`,
            });
        } finally {
            setIsLoading(false);
        }
    }, [projectId, phaseId, toast]);

    useEffect(() => {
        fetchPhaseData();
    }, [fetchPhaseData]);

    const handleAddTask = () => {
        setEditingTask(null);
        setIsTaskFormOpen(true);
    };

    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setIsTaskFormOpen(true);
    };

    const handleTaskFormClose = () => {
         setIsTaskFormOpen(false);
         setEditingTask(null);
    };

    const handleTaskSaved = (savedTask: Task) => {
        fetchPhaseData(); 
        handleTaskFormClose(); 
        toast({
          title: editingTask ? 'Tarea Actualizada' : 'Tarea Creada',
          description: `La tarea "${savedTask.title}" ha sido guardada exitosamente.`,
        });
    };

    const handleDeleteTask = async (taskIdToDelete: string) => {
        if (!taskIdToDelete) return;
        // Optional: Add confirmation dialog
        try {
            const response = await fetch(`/api/tasks/${taskIdToDelete}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to delete task' }));
                throw new Error(errorData.message);
            }
            toast({
                title: 'Tarea Eliminada',
                description: 'La tarea ha sido eliminada exitosamente.',
            });
            fetchPhaseData(); 
        } catch (err: any) {
            console.error("Error deleting task:", err);
            toast({
                variant: "destructive",
                title: "Error al Eliminar",
                description: `No se pudo eliminar la tarea: ${err.message}`,
            });
        }
    };

    const openAssignMaterialDialog = (task: Task) => {
        setSelectedTaskForMaterials(task);
        setIsAssignMaterialDialogOpen(true);
    };

    const closeAssignMaterialDialog = () => {
        setSelectedTaskForMaterials(null);
        setIsAssignMaterialDialogOpen(false);
        fetchPhaseData(); 
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <span className="ml-2">Cargando tareas...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-4 md:p-8 text-center">
                 <p className="text-destructive mb-4">{error}</p>
                <Button variant="outline" onClick={() => router.push(`/dashboard/${projectId}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
                </Button>
            </div>
        );
    }

    if (!phaseDetails) {
         return (
            <div className="container mx-auto p-4 md:p-8 text-center">
                 <p className="text-muted-foreground mb-4">No se encontraron los detalles de la fase.</p>
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
                 <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
                    <DialogTrigger asChild>
                         <Button onClick={handleAddTask}>
                             <PlusCircle className="mr-2 h-4 w-4" /> Agregar Tarea
                         </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[750px] max-h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>{editingTask ? 'Editar Tarea' : 'Agregar Nueva Tarea'}</DialogTitle>
                        </DialogHeader>
                        <TaskForm
                            projectId={projectId}
                            phaseUUID={phaseId} 
                            existingTask={editingTask}
                            onTaskSaved={handleTaskSaved}
                            onCancel={handleTaskFormClose}
                         />
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Lista de Tareas</CardTitle>
                    <CardDescription>Tareas planeadas para la fase "{phaseDetails.phaseName}".</CardDescription>
                </CardHeader>
                <CardContent>
                    {tasks.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Título</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-center">Dur. (días)</TableHead>
                                    <TableHead className="text-center">Progreso</TableHead>
                                    <TableHead className="text-center">Inicio</TableHead>
                                    <TableHead className="text-center">Fin</TableHead>
                                    <TableHead className="text-right">Costo Est.</TableHead>
                                    <TableHead>Materiales</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tasks.map((task) => (
                                    <TableRow key={task._id}>
                                        <TableCell className="font-medium">{task.title}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                task.status === 'Realizado' ? 'default' :
                                                task.status === 'En Progreso' ? 'secondary' :
                                                'outline'
                                            }>{task.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">{task.estimatedDuration ?? '-'}</TableCell>
                                         <TableCell className="text-center min-w-[100px]">
                                            {task.executionPercentage !== null && task.executionPercentage !== undefined ? (
                                                <div className="flex items-center justify-center gap-2">
                                                     <Progress value={task.executionPercentage} className="h-2 flex-1" />
                                                     <span className="text-xs text-muted-foreground">{task.executionPercentage}%</span>
                                                </div>
                                            ) : (
                                                 '-'
                                            )}
                                         </TableCell>
                                         <TableCell className="text-center">
                                              {task.startDate ? format(new Date(task.startDate), 'dd/MM/yy', { locale: es }) : '-'}
                                         </TableCell>
                                          <TableCell className="text-center">
                                             {task.endDate ? format(new Date(task.endDate), 'dd/MM/yy', { locale: es }) : '-'}
                                          </TableCell>
                                        <TableCell className="text-right">{task.estimatedCost.toLocaleString()}</TableCell>
                                        <TableCell>
                                            {task._id && (
                                                <Button variant="outline" size="sm" onClick={() => openAssignMaterialDialog(task)}>
                                                    <PackagePlus className="h-4 w-4 mr-1" /> Asignar
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                             <Button variant="ghost" size="icon" onClick={() => handleEditTask(task)}>
                                                 <Edit className="h-4 w-4" />
                                                 <span className="sr-only">Editar</span>
                                             </Button>
                                             {task._id && (
                                                 <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task._id!)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                    <span className="sr-only">Eliminar</span>
                                                 </Button>
                                             )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                         <div className="text-center py-8">
                            <p className="text-muted-foreground mb-4">No hay tareas definidas para esta fase.</p>
                            <Button onClick={handleAddTask}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Agregar Tarea
                            </Button>
                         </div>
                    )}
                </CardContent>
            </Card>
            <Toaster /> {/* Add Toaster for notifications */}
            {selectedTaskForMaterials && selectedTaskForMaterials._id && (
                <AssignMaterialToTaskDialog
                    taskId={selectedTaskForMaterials._id}
                    projectId={projectId}
                    isOpen={isAssignMaterialDialogOpen}
                    onClose={closeAssignMaterialDialog}
                    onMaterialsUpdated={fetchPhaseData} 
                />
            )}
        </div>
    );
}
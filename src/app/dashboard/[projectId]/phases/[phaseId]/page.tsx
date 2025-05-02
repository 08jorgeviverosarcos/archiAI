
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, PlusCircle, Trash2, Edit, Calendar as CalendarIcon } from 'lucide-react'; // Use CalendarIcon alias
import { useToast } from '@/hooks/use-toast';
import { InitialPlanPhase, Task } from '@/types'; // Assuming InitialPlan defines the phase structure
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
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
import { TaskForm } from '@/components/TaskForm'; // Import the TaskForm component
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress'; // Import Progress component
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Import Spanish locale for date formatting


// Rename phaseId to phaseUUID to match the route parameter name and logic
export default function PhaseTasksPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;
    const phaseUUID = params.phaseId as string; // Get the UUID from the route
    const { toast } = useToast();

    const [phaseDetails, setPhaseDetails] = useState<InitialPlanPhase | null>(null); // Store phase details
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false); // State for the add/edit task dialog
    const [editingTask, setEditingTask] = useState<Task | null>(null); // State for the task being edited

    // Fetch phase details and tasks
    const fetchPhaseData = useCallback(async () => {
        if (!projectId || !phaseUUID) return;
        console.log(`Fetching data for projectId: ${projectId}, phaseUUID: ${phaseUUID}`);
        setIsLoading(true);
        setError(null);
        try {
            // 1. Fetch InitialPlan directly using projectId to find the phase details by UUID
            console.log(`Fetching initial plan for project ID: ${projectId}`);
            const planRes = await fetch(`/api/initial-plans/${projectId}`); // Fetch plan by projectId
            console.log(`Initial plan fetch status: ${planRes.status}`);
            if (!planRes.ok) {
                if (planRes.status === 404) {
                    // Try fetching project details to confirm project exists
                    const projectRes = await fetch(`/api/projects/${projectId}`);
                    if (projectRes.ok) {
                        // Project exists but plan doesn't
                         throw new Error("Planificación inicial no encontrada para este proyecto.");
                    } else {
                         throw new Error("Proyecto no encontrado.");
                    }
                }
                let errorMsg = "Fallo al cargar la planificación inicial.";
                try {
                    const errorData = await planRes.json();
                    errorMsg = errorData.message || errorMsg;
                } catch (e) {/* ignore */}
                throw new Error(errorMsg);
            }
            const planData = await planRes.json();
            console.log("Fetched initial plan data:", planData);

            // Check if initialPlan exists and has phases
            if (!planData.initialPlan || !Array.isArray(planData.initialPlan.phases)) {
                throw new Error("La estructura de la planificación inicial es inválida o no contiene fases.");
            }


            // Find the specific phase within the fetched plan using phaseUUID
            const foundPhase = planData.initialPlan.phases.find((p: InitialPlanPhase) => p.phaseId === phaseUUID);
            console.log("Found phase:", foundPhase);

            if (foundPhase) {
                setPhaseDetails(foundPhase);
            } else {
                // Phase not found within the plan
                throw new Error(`Fase con UUID ${phaseUUID} no encontrada en la planificación del proyecto ${projectId}`);
            }

             // 2. Fetch tasks for the specific phase
             console.log(`Fetching tasks for phase UUID: ${phaseUUID}`);
             const tasksRes = await fetch(`/api/tasks?projectId=${projectId}&phaseUUID=${phaseUUID}`);
             console.log(`Tasks fetch status: ${tasksRes.status}`);
             if (!tasksRes.ok) {
                let errorMsg = "Fallo al cargar las tareas.";
                try {
                    const errorData = await tasksRes.json();
                    errorMsg = errorData.message || errorMsg;
                } catch (e) {/* ignore */}
                 throw new Error(errorMsg);
             }
             const tasksData = await tasksRes.json();
             console.log("Fetched tasks data:", tasksData);
             setTasks(tasksData.tasks || []);


        } catch (err: any) {
            console.error("Error loading phase tasks page:", err);
            setError(`${err.message}`); // Set more specific error
            setPhaseDetails(null); // Clear phase details on error
            setTasks([]); // Clear tasks on error
            toast({
                variant: "destructive",
                title: "Error",
                description: `${err.message}`,
            });
        } finally {
            setIsLoading(false);
            console.log("Finished fetching phase data.");
        }
    }, [projectId, phaseUUID, toast]);


    useEffect(() => {
        fetchPhaseData();
    }, [fetchPhaseData]); // Fetch data when component mounts or dependencies change

    // Handle opening the form for adding a new task
    const handleAddTask = () => {
        setEditingTask(null); // Ensure we are not editing
        setIsFormOpen(true);
    };

    // Handle opening the form for editing an existing task
    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setIsFormOpen(true);
    };

     // Handle closing the form
     const handleFormClose = () => {
         setIsFormOpen(false);
         setEditingTask(null); // Clear editing state
     };

    // Callback function for when a task is saved (created or updated)
    const handleTaskSaved = (savedTask: Task) => {
        fetchPhaseData(); // Refetch tasks to show the latest data
        handleFormClose(); // Close the dialog
        toast({
          title: editingTask ? 'Tarea Actualizada' : 'Tarea Creada',
          description: `La tarea "${savedTask.title}" ha sido guardada exitosamente.`,
        });
    };

    // Handle deleting a task
     const handleDeleteTask = async (taskId: string) => {
        if (!taskId) return;

        // Optional: Add a confirmation dialog here

        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                let errorMsg = 'Failed to delete task';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                } catch(e) {/* ignore */}
                throw new Error(errorMsg);
            }

            toast({
                title: 'Tarea Eliminada',
                description: 'La tarea ha sido eliminada exitosamente.',
            });
            fetchPhaseData(); // Refresh the task list
        } catch (err: any) {
            console.error("Error deleting task:", err);
            toast({
                variant: "destructive",
                title: "Error al Eliminar",
                description: `No se pudo eliminar la tarea: ${err.message}`,
            });
        }
     };


    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <span className="ml-2">Cargando tareas...</span>
            </div>
        );
    }

     // Error state or if phase details couldn't be loaded
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

    // If loading is finished but phaseDetails is still null (should be caught by error state now)
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
                 <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                         <Button onClick={handleAddTask}>
                             <PlusCircle className="mr-2 h-4 w-4" /> Agregar Tarea
                         </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[750px]"> {/* Increased width */}
                        <DialogHeader>
                            <DialogTitle>{editingTask ? 'Editar Tarea' : 'Agregar Nueva Tarea'}</DialogTitle>
                        </DialogHeader>
                        <TaskForm
                            projectId={projectId}
                            phaseUUID={phaseUUID}
                            existingTask={editingTask} // Pass task if editing, null if adding
                            onTaskSaved={handleTaskSaved}
                            onCancel={handleFormClose}
                         />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Task List Area */}
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
                                                'outline' // Pendiente
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
                                        <TableCell className="text-right space-x-1">
                                             <Button variant="ghost" size="icon" onClick={() => handleEditTask(task)}>
                                                 <Edit className="h-4 w-4" />
                                                 <span className="sr-only">Editar</span>
                                             </Button>
                                             {/* Ensure task._id is not undefined before calling delete */}
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
                {/* Optional Footer */}
                {/* <CardFooter>
                    <p>Total de tareas: {tasks.length}</p>
                </CardFooter> */}
            </Card>

        </div>
    );
}

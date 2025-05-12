'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ProjectDetails, Task, FrontendInitialPlanPhase } from '@/types'; // Updated types
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowRight, ArrowLeft, AlertCircle, Trash2, Plus, GripVertical, ListTree, MinusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { DndProvider, useDrag, useDrop, DropTargetMonitor, XYCoord } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Accordion, AccordionContent, AccordionItem as RadixAccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatNumberForInput, parseFormattedNumber } from '@/lib/formattingUtils';


interface PlanDisplayProps {
  projectDetails: ProjectDetails | null;
  initialPlan: FrontendInitialPlanPhase[] | null;
  initialPlanId: string | null;
  projectId: string | null;
  onGoBack: () => void;
}

const ItemTypes = {
  PHASE: 'phase',
  TASK: 'task',
};

interface DraggableRowProps {
  phase: FrontendInitialPlanPhase; 
  index: number;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  handlePhaseNameChange: (index: number, newName: string) => void;
  handleDurationChange: (index: number, newDuration: number) => void;
  handleCostChange: (index: number, newCost: number) => void;
  handleDeletePhase: (index: number) => void;
  handleTaskChange: (phaseIndex: number, taskIndex: number, field: keyof Task, value: string | number) => void;
  handleAddTaskToPhase: (phaseIndex: number) => void;
  handleDeleteTaskFromPhase: (phaseIndex: number, taskIndex: number) => void;
  currency: string;
}

interface DragItem {
  index: number;
  id: string;
  type: string;
}


const DraggableTableRow: React.FC<DraggableRowProps> = ({
  phase,
  index,
  moveRow,
  handlePhaseNameChange,
  handleDurationChange,
  handleCostChange,
  handleDeletePhase,
  handleTaskChange,
  handleAddTaskToPhase,
  handleDeleteTaskFromPhase,
  currency,
}) => {
  const ref = useRef<HTMLTableSectionElement>(null); // Changed to HTMLTableSectionElement for tbody
  const phaseId = phase.phaseId || `phase-${index}`;

  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: string | symbol | null }>({
    accept: ItemTypes.PHASE,
    collect(monitor) {
        return {
            handlerId: monitor.getHandlerId(),
        };
    },
    hover(item: DragItem, monitor: DropTargetMonitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset(); 
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      
      moveRow(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.PHASE,
    item: () => ({ id: phaseId, index, type: ItemTypes.PHASE }),
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Apply drop to the tbody element
  drop(ref);


  return (
    <tbody ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }} data-handler-id={handlerId?.toString()} className="draggable-phase-group">
      <TableRow      
        className="bg-muted/20 hover:bg-muted/40"
      >
        <TableCell className="w-10 cursor-move p-2" ref={drag}> {/* Apply drag to a specific handle if preferred */}
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </TableCell>
        <TableCell className="min-w-[250px] p-2">
          <Input
            type="text"
            value={phase.phaseName}
            onChange={(e) => handlePhaseNameChange(index, e.target.value)}
            className="w-full font-semibold"
          />
        </TableCell>
        <TableCell className="w-[180px] p-2">
          <Input
            type="number"
            value={phase.estimatedDuration === 0 ? '' : phase.estimatedDuration}
            onChange={(e) => handleDurationChange(index, Number(e.target.value))}
            className="w-full"
            min="0"
          />
        </TableCell>
        <TableCell className="w-[200px] p-2">
          <Input
            type="text" // Changed to text
            value={phase.estimatedCost === 0 ? '' : formatNumberForInput(phase.estimatedCost)}
            onChange={(e) => handleCostChange(index, parseFormattedNumber(e.target.value) ?? 0)}
            className="w-full"
          />
        </TableCell>
        <TableCell className="w-[100px] text-center p-2">
           <AccordionTrigger className="p-1 justify-center [&_svg]:transition-transform [&_svg[data-state=open]]:rotate-180">
              <ListTree className="h-5 w-5" />
              <span className="ml-1 text-xs">({phase.tasks?.length || 0})</span>
           </AccordionTrigger>
        </TableCell>
        <TableCell className="w-[60px] text-center p-2">
          <Button variant="ghost" size="icon" onClick={() => handleDeletePhase(index)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </TableCell>
      </TableRow>
      <TableRow>
          <TableCell colSpan={6} className="p-0"> 
              <AccordionContent className="bg-background">
                   <div className="p-4 space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground">Tareas de "{phase.phaseName}"</h4>
                      {phase.tasks && phase.tasks.length > 0 ? (
                          <Table className="bg-card rounded-md">
                              <TableHeader>
                                  <TableRow>
                                      <TableHead className="w-[40%]">Nombre Tarea</TableHead>
                                      <TableHead className="w-[25%]">Duración (días)</TableHead>
                                      <TableHead className="w-[25%]">Costo ({currency})</TableHead>
                                      <TableHead className="w-[10%] text-right">Acción</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {phase.tasks.map((task, taskIndex) => (
                                      <TableRow key={task._id || `task-${index}-${taskIndex}`}>
                                          <TableCell>
                                              <Input type="text" value={task.title} onChange={(e) => handleTaskChange(index, taskIndex, 'title', e.target.value)} className="w-full text-xs"/>
                                          </TableCell>
                                          <TableCell>
                                              <Input type="number" value={task.estimatedDuration === 0 ? '' : task.estimatedDuration ?? ''} onChange={(e) => handleTaskChange(index, taskIndex, 'estimatedDuration', Number(e.target.value))} className="w-full text-xs" min="0"/>
                                          </TableCell>
                                          <TableCell>
                                              <Input 
                                                type="text" // Changed to text
                                                value={task.estimatedCost === 0 ? '' : formatNumberForInput(task.estimatedCost)} 
                                                onChange={(e) => handleTaskChange(index, taskIndex, 'estimatedCost', parseFormattedNumber(e.target.value) ?? 0)} 
                                                className="w-full text-xs" />
                                          </TableCell>
                                          <TableCell className="text-right">
                                              <Button variant="ghost" size="icon" onClick={() => handleDeleteTaskFromPhase(index, taskIndex)}>
                                                  <MinusCircle className="h-3 w-3 text-destructive"/>
                                              </Button>
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      ) : (
                          <p className="text-xs text-muted-foreground italic">No hay tareas definidas para esta fase.</p>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleAddTaskToPhase(index)}>
                          <Plus className="mr-1 h-3 w-3"/> Agregar Tarea a Fase
                      </Button>
                   </div>
              </AccordionContent>
          </TableCell>
      </TableRow>
    </tbody>
  );
};


export const PlanDisplay: React.FC<PlanDisplayProps> = ({
  projectDetails,
  initialPlan, 
  initialPlanId,
  projectId,
  onGoBack,
}) => {
    const [editablePlan, setEditablePlan] = useState<FrontendInitialPlanPhase[] | null>(null);
    const [totalCost, setTotalCost] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        console.log("PlanDisplay: Initial plan prop received:", initialPlan);
        if (initialPlan) {
            const planArray = Array.isArray(initialPlan) ? initialPlan : [];
            const sortedPlan = [...planArray].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            const planWithTasksEnsured = sortedPlan.map(phase => ({
                ...phase,
                tasks: phase.tasks || [] 
            }));
            setEditablePlan(planWithTasksEnsured);
            console.log("PlanDisplay: Editable plan state initialized/updated with sorted data:", planWithTasksEnsured);
        } else {
            setEditablePlan(null);
            console.log("PlanDisplay: Initial plan prop is null, resetting state.");
        }
    }, [initialPlan]);


    useEffect(() => {
        if (editablePlan) {
            const calculatedTotalCost = editablePlan.reduce((sum, phase) => {
                const phaseCost = phase.tasks && phase.tasks.length > 0
                    ? phase.tasks.reduce((taskSum, task) => taskSum + (Number(task.estimatedCost) || 0), 0)
                    : (Number(phase.estimatedCost) || 0);
                return sum + phaseCost;
            }, 0);
            setTotalCost(calculatedTotalCost);
            console.log("PlanDisplay: Recalculated total cost:", calculatedTotalCost);
        } else {
            setTotalCost(0);
        }
    }, [editablePlan]);


  const handleCostChange = (index: number, newCost: number) => {
    if (editablePlan) {
      const updatedPlan = editablePlan.map((phase, i) =>
         i === index ? { ...phase, estimatedCost: isNaN(newCost) ? 0 : newCost } : phase
        );
      setEditablePlan(updatedPlan);
    }
  };

  const handleDurationChange = (index: number, newDuration: number) => {
     if (editablePlan) {
       const updatedPlan = editablePlan.map((phase, i) =>
         i === index ? { ...phase, estimatedDuration: isNaN(newDuration) ? 0 : newDuration } : phase
        );
       setEditablePlan(updatedPlan);
     }
   };

   const handlePhaseNameChange = (index: number, newName: string) => {
     if (editablePlan) {
        const updatedPlan = editablePlan.map((phase, i) =>
         i === index ? { ...phase, phaseName: newName } : phase
        );
       setEditablePlan(updatedPlan);
     }
   };

  const handleTaskChange = (phaseIndex: number, taskIndex: number, field: keyof Task, value: string | number) => {
    setEditablePlan(prevPlan => {
        if (!prevPlan) return null;
        return prevPlan.map((phase, pIdx) => {
            if (pIdx === phaseIndex) {
                const updatedTasks = phase.tasks.map((task, tIdx) => {
                    if (tIdx === taskIndex) {
                        const newValue = (field === 'title') ? value : Number(value); // Ensure numeric fields are numbers
                        return { ...task, [field]: newValue };
                    }
                    return task;
                });
                const newPhaseCost = updatedTasks.reduce((sum, t) => sum + (Number(t.estimatedCost) || 0), 0);
                const newPhaseDuration = updatedTasks.reduce((sum, t) => sum + (Number(t.estimatedDuration) || 0), 0); 
                return { ...phase, tasks: updatedTasks, estimatedCost: newPhaseCost, estimatedDuration: newPhaseDuration };
            }
            return phase;
        });
    });
  };

  const handleAddTaskToPhase = (phaseIndex: number) => {
    setEditablePlan(prevPlan => {
        if (!prevPlan) return null;
        return prevPlan.map((phase, pIdx) => {
            if (pIdx === phaseIndex) {
                const newTask: Task = {
                    _id: `new-task-${crypto.randomUUID()}`, // Temporary client-side ID
                    projectId: projectDetails?._id || '', 
                    phaseUUID: phase.phaseId,
                    title: 'Nueva Tarea', 
                    estimatedDuration: 0,
                    estimatedCost: 0,
                    quantity: 1, 
                    unitOfMeasure: 'unidad', 
                    unitPrice: 0, 
                    status: 'Pendiente', 
                    description: '',
                    profitMargin: null,
                    laborCost: null,
                    executionPercentage: 0,
                    startDate: null,
                    endDate: null,
                };
                return { ...phase, tasks: [...phase.tasks, newTask] };
            }
            return phase;
        });
    });
  };

  const handleDeleteTaskFromPhase = (phaseIndex: number, taskIndex: number) => {
    setEditablePlan(prevPlan => {
        if (!prevPlan) return null;
        return prevPlan.map((phase, pIdx) => {
            if (pIdx === phaseIndex) {
                const updatedTasks = phase.tasks.filter((_, tIdx) => tIdx !== taskIndex);
                const newPhaseCost = updatedTasks.reduce((sum, t) => sum + (Number(t.estimatedCost) || 0), 0);
                const newPhaseDuration = updatedTasks.reduce((sum, t) => sum + (Number(t.estimatedDuration) || 0), 0);
                return { ...phase, tasks: updatedTasks, estimatedCost: newPhaseCost, estimatedDuration: newPhaseDuration };
            }
            return phase;
        });
    });
  };


  const handleAddPhase = () => {
        const newOrder = editablePlan ? editablePlan.length + 1 : 1;
        const newPhase: FrontendInitialPlanPhase = {
            phaseId: crypto.randomUUID(),
            phaseName: 'Nueva Fase',
            estimatedDuration: 0,
            estimatedCost: 0,
            tasks: [], 
            order: newOrder,
            // _id will be assigned by DB upon saving this phase if it's new,
            // or it should be present if fetched. For a new client-side phase, it's undefined.
        };
        setEditablePlan(prevPlan => (prevPlan ? [...prevPlan, newPhase] : [newPhase]));
        console.log("PlanDisplay: Added new phase:", newPhase);
    };

  const handleDeletePhase = (index: number) => {
    if (editablePlan) {
        const updatedPlan = editablePlan
        .filter((_, i) => i !== index)
        .map((phase, i) => ({ ...phase, order: i + 1 }));
        setEditablePlan(updatedPlan);
        console.log("PlanDisplay: Deleted phase at index", index, "New plan:", updatedPlan);
    }
  };

   const moveRow = useCallback((dragIndex: number, hoverIndex: number) => {
         setEditablePlan((prevPlan) => {
            if (!prevPlan) return null;
            const updatedPlan = [...prevPlan];
            const [draggedItem] = updatedPlan.splice(dragIndex, 1);
            updatedPlan.splice(hoverIndex, 0, draggedItem);
            return updatedPlan.map((phase, index) => ({ ...phase, order: index + 1 }));
         });
     }, []);


  const handleSave = async () => {
    if (!initialPlanId || !editablePlan) {
      console.error('Initial Plan ID or editable plan is missing.');
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'No se encontró el ID del plan inicial o el plan está vacío.',
      });
      return;
    }
    
    const planToSaveForApi = editablePlan.map((phase, index) => ({
      _id: phase._id, 
      phaseId: phase.phaseId,
      phaseName: phase.phaseName,
      estimatedDuration: phase.estimatedDuration,
      estimatedCost: phase.estimatedCost,
      order: index + 1,
    }));

    console.log("PlanDisplay: Saving plan with ID:", initialPlanId, "Data to send (phases only for PUT):", planToSaveForApi);

    setIsSaving(true);
    try {
      const response = await fetch('/api/generate-plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialPlanId: initialPlanId, initialPlan: planToSaveForApi }), 
      });

      if (!response.ok) {
        let errorData = { message: `Server error: ${response.statusText}` };
        try { errorData = await response.json(); } catch (e) { console.error("Failed to parse error response as JSON"); }
        console.error('PlanDisplay: Error saving plan - Response status:', response.status, 'Error data:', errorData);
        throw new Error(errorData.message || 'Fallo al actualizar el plan inicial');
      }

      const result = await response.json();
      console.log('PlanDisplay: Plan saved successfully', result);
      toast({
        title: 'Plan Guardado',
        description: 'La planificación inicial se ha actualizado correctamente.',
      });
       if (projectId) {
            console.log("PlanDisplay: Navigating to dashboard for project ID:", projectId);
           router.push(`/dashboard/${projectId}`);
       } else {
            console.warn("PlanDisplay: Project ID is missing, navigating back using onGoBack.");
            onGoBack();
       }

    } catch (error: any) {
      console.error('PlanDisplay: Error caught during save:', error);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: error.message || 'Ocurrió un error al guardar los cambios.',
      });
    } finally {
        setIsSaving(false);
    }
  };


  if (!projectDetails) {
    return <div className="text-center p-8">Cargando detalles del proyecto...</div>;
  }

  const budgetExceeded = projectDetails?.totalBudget !== null && typeof projectDetails?.totalBudget === 'number' && totalCost > projectDetails.totalBudget;


  return (
     <DndProvider backend={HTML5Backend}>
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Revisar Planificación Inicial - {projectDetails?.projectName ?? 'Proyecto Sin Nombre'}</h2>
          <div>
            <h3 className="text-lg font-semibold mb-2 border-b pb-1">Planificación Generada (Fases y Tareas)</h3>
             {editablePlan && editablePlan.length > 0 ? (
                <Accordion type="multiple" className="w-full" asChild>
                  <Table>
                    <TableCaption className="mt-4">Arrastra las filas <GripVertical className="inline h-4 w-4 mx-1 align-middle" /> para reordenar las fases. Expande para ver y editar tareas.</TableCaption>
                    <TableHeader>
                      <TableRow>
                         <TableHead className="w-10 p-2"></TableHead>
                        <TableHead className="min-w-[250px] p-2">Fase</TableHead>
                        <TableHead className="w-[180px] p-2">Duración (días)</TableHead>
                        <TableHead className="w-[200px] p-2">Costo ({projectDetails?.currency ?? '---'})</TableHead>
                        <TableHead className="w-[100px] text-center p-2">Tareas</TableHead>
                        <TableHead className="w-[60px] text-center p-2">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    {/* TableBody is part of DraggableTableRow now, so remove the explicit <TableBody> here */}
                      {editablePlan.map((phase, index) => (
                         <RadixAccordionItem 
                            key={phase.phaseId || `phase-item-${index}`} 
                            value={phase.phaseId || `phase-item-${index}`} 
                            asChild
                          >
                              <DraggableTableRow
                                  index={index}
                                  phase={phase}
                                  moveRow={moveRow}
                                  handlePhaseNameChange={handlePhaseNameChange}
                                  handleDurationChange={handleDurationChange}
                                  handleCostChange={handleCostChange}
                                  handleDeletePhase={handleDeletePhase}
                                  handleTaskChange={handleTaskChange}
                                  handleAddTaskToPhase={handleAddTaskToPhase}
                                  handleDeleteTaskFromPhase={handleDeleteTaskFromPhase}
                                  currency={projectDetails?.currency ?? '---'}
                              />
                          </RadixAccordionItem>
                      ))}
                  </Table>
                </Accordion>
            ) : (
                <p className="text-muted-foreground italic p-4 text-center">Aún no se han agregado fases a este plan.</p>
            )}
            <Button variant="secondary" onClick={handleAddPhase} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Fase Principal
            </Button>
          </div>

          <div>
             <h3 className="text-lg font-semibold mb-2 border-b pb-1">Resumen del Presupuesto</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm p-4 border rounded-md bg-muted/30">
                <p className="font-medium">Presupuesto Total Ingresado:</p>
                <p className="text-right font-mono">{(projectDetails?.totalBudget ?? 0).toLocaleString('es-CO')} {projectDetails?.currency ?? '---'}</p>
                <p className="font-medium">Costo Estimado Planificación:</p>
                 <p className={`text-right font-mono ${budgetExceeded ? 'text-destructive font-semibold' : ''}`}>
                    {totalCost.toLocaleString('es-CO')} {projectDetails?.currency ?? '---'}
                 </p>
            </div>
             {budgetExceeded && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>¡Atención!</AlertTitle>
                  <AlertDescription>El costo estimado total de la planificación excede el presupuesto inicial.</AlertDescription>
                </Alert>
              )}
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onGoBack} disabled={isSaving}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !editablePlan || editablePlan.length === 0}>
              {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
    </DndProvider>
  );
};

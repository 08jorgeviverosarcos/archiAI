'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ProjectDetails, InitialPlan } from '@/types';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowRight, ArrowLeft, AlertCircle, Trash2, Plus, GripVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
// Basic drag-and-drop setup (consider a library like react-beautiful-dnd for more complex needs)
import { DndProvider, useDrag, useDrop, DropTargetMonitor } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface PlanDisplayProps {
  projectDetails: ProjectDetails | null; // Allow null
  initialPlan: InitialPlan[] | null;
  initialPlanId: string | null; // Receive the ID of the InitialPlan document
  projectId: string | null; // Project ID might still be useful for context or navigation
  setIsCreatingProject?: (isCreating: boolean) => void; // Optional: To go back to project selection/creation
  setSelectedProject?: (project: ProjectDetails | null) => void; // To go back to project selection
}

const ItemTypes = {
  PHASE: 'phase',
};

interface DraggableRowProps {
  phase: InitialPlan;
  index: number;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  handlePhaseNameChange: (index: number, newName: string) => void;
  handleDurationChange: (index: number, newDuration: number) => void;
  handleCostChange: (index: number, newCost: number) => void;
  handleDeletePhase: (index: number) => void;
  currency: string;
}

// Interface for the drag item
interface DragItem {
  index: number;
  id: string; // Use phaseId as the identifier
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
  currency,
}) => {
  const ref = useRef<HTMLTableRowElement>(null);
  const phaseId = phase.phaseId || `phase-${index}`; // Ensure a unique ID

  const [, drop] = useDrop<DragItem, void, { handlerId: string | symbol | null }>({
    accept: ItemTypes.PHASE,
    collect(monitor) {
        return {
            handlerId: monitor.getHandlerId(),
        }
    },
    hover(item: DragItem, monitor: DropTargetMonitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }
       // Determine rectangle on screen
       const hoverBoundingRect = ref.current?.getBoundingClientRect();
       // Get vertical middle
       const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
       // Determine mouse position
       const clientOffset = monitor.getClientOffset();
       // Get pixels to the top
       const hoverClientY = clientOffset!.y - hoverBoundingRect.top;
       // Only perform the move when the mouse has crossed half of the items height
       // When dragging downwards, only move when the cursor is below 50%
       // When dragging upwards, only move when the cursor is above 50%
       // Dragging downwards
       if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
           return;
       }
       // Dragging upwards
       if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
            return;
       }

      // Time to actually perform the action
      moveRow(dragIndex, hoverIndex);
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.PHASE,
    item: () => { return { id: phaseId, index } }, // Return object with id and index
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  preview(drop(ref)); // Combine drop and preview refs

  return (
    <TableRow
      ref={ref}
      key={phaseId} // Use unique phaseId
      style={{ opacity: isDragging ? 0.5 : 1 }}
      // Remove the invalid data-handler-id prop
    >
      <TableCell className="w-10 cursor-move" ref={drag}> {/* Apply drag handle ref here */}
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </TableCell>
      <TableCell className="min-w-[250px]"> {/* Ensure enough width */}
        <Input
          type="text"
          value={phase.phaseName}
          onChange={(e) => handlePhaseNameChange(index, e.target.value)}
          className="w-full"
        />
      </TableCell>
      <TableCell className="w-[180px]"> {/* Adjusted width */}
        <Input
          type="number"
           value={phase.estimatedDuration === 0 ? '' : phase.estimatedDuration} // Handle 0 for placeholder
          onChange={(e) => handleDurationChange(index, Number(e.target.value))}
          className="w-full"
           min="0" // Prevent negative numbers
        />
      </TableCell>
      <TableCell className="w-[200px]"> {/* Adjusted width */}
        <Input
          type="number"
           value={phase.estimatedCost === 0 ? '' : phase.estimatedCost} // Handle 0 for placeholder
          onChange={(e) => handleCostChange(index, Number(e.target.value))}
          className="w-full"
           min="0" // Prevent negative numbers
        />
      </TableCell>
      <TableCell className="w-[60px] text-center"> {/* Adjusted width */}
        <Button variant="ghost" size="icon" onClick={() => handleDeletePhase(index)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
};


export const PlanDisplay: React.FC<PlanDisplayProps> = ({
  projectDetails,
  initialPlan,
  initialPlanId, // Use this ID for saving
  projectId,
  setIsCreatingProject,
  setSelectedProject
}) => {
    // State to hold the plan being edited
    const [editablePlan, setEditablePlan] = useState<InitialPlan[] | null>(null);
    // State to hold the original fetched plan for comparison or reset (optional)
    const [originalPlan, setOriginalPlan] = useState<InitialPlan[] | null>(null);
    const [totalCost, setTotalCost] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    // Effect to initialize or update the editable plan when initialPlan prop changes
    useEffect(() => {
        console.log("PlanDisplay: Initial plan prop received:", initialPlan);
        if (initialPlan) {
            // Sort the incoming plan by 'order' before setting state
            const sortedPlan = [...initialPlan].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setEditablePlan(sortedPlan);
            setOriginalPlan(sortedPlan); // Store the original sorted plan
            console.log("PlanDisplay: Editable plan state initialized/updated with sorted data:", sortedPlan);
        } else {
            setEditablePlan(null); // Reset if initialPlan is null
            setOriginalPlan(null);
            console.log("PlanDisplay: Initial plan prop is null, resetting state.");
        }
    }, [initialPlan]); // Dependency on initialPlan


    // Effect to recalculate total cost whenever the editable plan changes
    useEffect(() => {
        if (editablePlan) {
            const calculatedTotalCost = editablePlan.reduce((sum, phase) => sum + (phase.estimatedCost || 0), 0);
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


  const handleAddPhase = () => {
        const newOrder = editablePlan ? editablePlan.length + 1 : 1;
        const newPhase: InitialPlan = {
            phaseId: crypto.randomUUID(), // Generate unique ID
            phaseName: 'Nueva Fase',
            estimatedDuration: 0,
            estimatedCost: 0,
            order: newOrder, // Assign the next order number
        };
        setEditablePlan(prevPlan => (prevPlan ? [...prevPlan, newPhase] : [newPhase]));
        console.log("PlanDisplay: Added new phase:", newPhase);
    };

  const handleDeletePhase = (index: number) => {
    if (editablePlan) {
        // Create a new array excluding the deleted phase and re-order
        const updatedPlan = editablePlan
        .filter((_, i) => i !== index)
        .map((phase, i) => ({ ...phase, order: i + 1 })); // Re-assign order starting from 1
        setEditablePlan(updatedPlan);
        console.log("PlanDisplay: Deleted phase at index", index, "New plan:", updatedPlan);
    }
  };

   // Function to handle moving rows for drag-and-drop
   const moveRow = useCallback((dragIndex: number, hoverIndex: number) => {
         setEditablePlan((prevPlan) => {
            if (!prevPlan) return null;
            const updatedPlan = [...prevPlan];
            const [draggedItem] = updatedPlan.splice(dragIndex, 1);
            updatedPlan.splice(hoverIndex, 0, draggedItem);
             // Re-assign order based on new array index
            return updatedPlan.map((phase, index) => ({ ...phase, order: index + 1 }));
         });
     }, []); // No dependencies needed as setEditablePlan handles state update


  const handleSave = async () => {
     // Use initialPlanId for the PUT request
    if (!initialPlanId || !editablePlan) {
      console.error('Initial Plan ID or editable plan is missing.');
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'No se encontró el ID del plan inicial o el plan está vacío.',
      });
      return;
    }

    // Ensure order is correctly set before saving
     const planToSave = editablePlan.map((phase, index) => ({
         ...phase,
         order: index + 1, // Explicitly set order based on final position
     }));

    console.log("PlanDisplay: Saving plan with ID:", initialPlanId, "Data:", planToSave);

    setIsSaving(true);
    try {
      const response = await fetch('/api/generate-plan', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
         // Send initialPlanId and the updated phases array (with correct order)
        body: JSON.stringify({ initialPlanId: initialPlanId, initialPlan: planToSave }),
      });

      if (!response.ok) {
        let errorData = { message: `Server error: ${response.statusText}` };
        try {
            errorData = await response.json();
        } catch (e) {
            console.error("Failed to parse error response as JSON");
        }
        console.error('PlanDisplay: Error saving plan - Response status:', response.status, 'Error data:', errorData);
        throw new Error(errorData.message || 'Fallo al actualizar el plan inicial');
      }

      const result = await response.json();
      console.log('PlanDisplay: Plan saved successfully', result);
      toast({
        title: 'Plan Guardado',
        description: 'La planificación inicial se ha actualizado correctamente.',
      });
      // Navigate to the project dashboard after saving
       if (projectId) {
            console.log("PlanDisplay: Navigating to dashboard for project ID:", projectId);
           router.push(`/dashboard/${projectId}`);
       } else {
            console.warn("PlanDisplay: Project ID is missing, navigating back.");
            // If project ID is somehow missing, attempt to go back or to home
            handleGoBack();
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

   // Function to handle going back
   const handleGoBack = () => {
        console.log("PlanDisplay: Go back triggered.");
     if (setSelectedProject) {
         setSelectedProject(null); // Go back to project selection
     } else if (setIsCreatingProject) {
         setIsCreatingProject(true); // Go back to creation form (if applicable)
     } else {
         router.push('/'); // Fallback to home
     }
   };


  if (!projectDetails) {
    // Should ideally not happen if parent component logic is correct, but good fallback
    return <div className="text-center p-8">Cargando detalles del proyecto...</div>;
  }

  // Calculate budget comparison safely
  const budgetExceeded = projectDetails?.totalBudget !== null && typeof projectDetails?.totalBudget === 'number' && totalCost > projectDetails.totalBudget;


  return (
     <DndProvider backend={HTML5Backend}>
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Revisar Planificación Inicial - {projectDetails?.projectName ?? 'Proyecto Sin Nombre'}</h2>

          {/* Planificación Table Section */}
          <div>
            <h3 className="text-lg font-semibold mb-2 border-b pb-1">Planificación Generada</h3>
             {editablePlan && editablePlan.length > 0 ? (
                <Table>
                  <TableCaption className="mt-4">Arrastra las filas <GripVertical className="inline h-4 w-4 mx-1 align-middle" /> para reordenar las fases.</TableCaption>
                  <TableHeader>
                    <TableRow>
                       <TableHead className="w-10"></TableHead> {/* Handle column */}
                      <TableHead className="min-w-[250px]">Fase</TableHead>
                      <TableHead className="w-[180px]">Duración Estimada (días)</TableHead>
                      <TableHead className="w-[200px]">Costo Estimado ({projectDetails?.currency ?? '---'})</TableHead>
                      <TableHead className="w-[60px] text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {/* Render rows using the DraggableTableRow component */}
                    {editablePlan.map((phase, index) => (
                      <DraggableTableRow
                        key={phase.phaseId || `phase-${index}`} // Ensure key is stable and unique
                        index={index}
                        phase={phase}
                        moveRow={moveRow}
                        handlePhaseNameChange={handlePhaseNameChange}
                        handleDurationChange={handleDurationChange}
                        handleCostChange={handleCostChange}
                        handleDeletePhase={handleDeletePhase}
                        currency={projectDetails?.currency ?? '---'}
                      />
                    ))}
                  </TableBody>
                </Table>
            ) : (
                <p className="text-muted-foreground italic p-4 text-center">Aún no se han agregado fases a este plan.</p>
            )}
             {/* Add Phase Button */}
            <Button variant="secondary" onClick={handleAddPhase} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Fase
            </Button>
          </div>


          {/* Budget Summary Section */}
          <div>
             <h3 className="text-lg font-semibold mb-2 border-b pb-1">Resumen del Presupuesto</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm p-4 border rounded-md bg-muted/30">
                <p className="font-medium">Presupuesto Total Ingresado:</p>
                <p className="text-right font-mono">{(projectDetails?.totalBudget ?? 0).toLocaleString()} {projectDetails?.currency ?? '---'}</p>
                <p className="font-medium">Costo Estimado Planificación:</p>
                 <p className={`text-right font-mono ${budgetExceeded ? 'text-destructive font-semibold' : ''}`}>
                    {totalCost.toLocaleString()} {projectDetails?.currency ?? '---'}
                 </p>
            </div>
             {/* Budget Exceeded Alert */}
             {budgetExceeded && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>¡Atención!</AlertTitle>
                  <AlertDescription>El costo estimado total de la planificación excede el presupuesto inicial.</AlertDescription>
                </Alert>
              )}
          </div>

           {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleGoBack} disabled={isSaving}>
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

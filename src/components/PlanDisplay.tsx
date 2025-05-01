'use client';

import React, { useState, useEffect } from 'react';
import { ProjectDetails, InitialPlan } from '@/types';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowRight, ArrowLeft, AlertCircle, Trash2, Plus, GripVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
// Basic drag-and-drop setup (consider a library like react-beautiful-dnd for more complex needs)
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface PlanDisplayProps {
  projectDetails: ProjectDetails;
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
  const ref = React.useRef<HTMLTableRowElement>(null);

  const [, drop] = useDrop({
    accept: ItemTypes.PHASE,
    hover(item: { index: number }, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) {
        return;
      }
      moveRow(dragIndex, hoverIndex);
      item.index = hoverIndex; // Update item index as it moves
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.PHASE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  preview(drop(ref)); // Combine drop and preview refs

  return (
    <TableRow
      ref={ref}
      key={phase.phaseId || index} // Use phaseId if available, fallback to index
      style={{ opacity: isDragging ? 0.5 : 1 }}
      data-handler-id={drop} // Use the drop ref directly if preview is separate
    >
      <TableCell className="w-10 cursor-move" ref={drag}> {/* Apply drag handle ref here */}
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </TableCell>
      <TableCell className="min-w-[200px]"> {/* Ensure enough width */}
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
           value={phase.estimatedDuration === 0 ? '' : phase.estimatedDuration}
          onChange={(e) => handleDurationChange(index, Number(e.target.value))}
          className="w-full"
        />
      </TableCell>
      <TableCell className="w-[200px]"> {/* Adjusted width */}
        <Input
          type="number"
           value={phase.estimatedCost === 0 ? '' : phase.estimatedCost}
          onChange={(e) => handleCostChange(index, Number(e.target.value))}
          className="w-full"
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
  // Initialize with sorted plan based on 'order' if available, else use initialPlan directly
  const [editablePlan, setEditablePlan] = useState<InitialPlan[] | null>(
      initialPlan ? [...initialPlan].sort((a, b) => a.order - b.order) : null
    );
  const [totalCost, setTotalCost] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();


  useEffect(() => {
    // Recalculate total cost whenever the editable plan changes
    if (editablePlan) {
      const calculatedTotalCost = editablePlan.reduce((sum, phase) => sum + (phase.estimatedCost || 0), 0);
      setTotalCost(calculatedTotalCost);
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
    if (editablePlan) {
      const newPhase: InitialPlan = {
        phaseId: crypto.randomUUID(),
        phaseName: 'Nueva Fase',
        estimatedDuration: 0,
        estimatedCost: 0,
        order: editablePlan.length + 1, // Set order based on new length
      };
      setEditablePlan([...editablePlan, newPhase]);
    } else {
        // Initialize plan if it was null
         const newPhase: InitialPlan = {
           phaseId: crypto.randomUUID(),
           phaseName: 'Nueva Fase',
           estimatedDuration: 0,
           estimatedCost: 0,
           order: 1,
         };
        setEditablePlan([newPhase]);
    }
  };

  const handleDeletePhase = (index: number) => {
    if (editablePlan) {
        // Create a new array excluding the deleted phase and re-order
      const updatedPlan = editablePlan
        .filter((_, i) => i !== index)
        .map((phase, i) => ({ ...phase, order: i + 1 })); // Re-assign order
      setEditablePlan(updatedPlan);
    }
  };

   // Function to handle moving rows for drag-and-drop
   const moveRow = (dragIndex: number, hoverIndex: number) => {
     if (editablePlan) {
       const draggedRow = editablePlan[dragIndex];
       const updatedPlan = [...editablePlan];
       updatedPlan.splice(dragIndex, 1); // Remove dragged item
       updatedPlan.splice(hoverIndex, 0, draggedRow); // Insert at hover position

       // Update the order property based on the new position
       const finalPlan = updatedPlan.map((phase, index) => ({
           ...phase,
           order: index + 1,
       }));

       setEditablePlan(finalPlan);
     }
   };


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

    setIsSaving(true);
    try {
      const response = await fetch('/api/generate-plan', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
         // Send initialPlanId and the updated phases array
        body: JSON.stringify({ initialPlanId: initialPlanId, initialPlan: editablePlan }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fallo al actualizar el plan inicial');
      }

      console.log('Plan saved successfully');
      toast({
        title: 'Plan Guardado',
        description: 'La planificación inicial se ha actualizado correctamente.',
      });
      // Navigate to the project dashboard after saving
       if (projectId) {
           router.push(`/dashboard/${projectId}`);
       } else {
            router.push('/'); // Fallback navigation
       }

    } catch (error: any) {
      console.error('Error al guardar el plan:', error);
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
     if (setSelectedProject) {
         setSelectedProject(null); // Go back to project selection
     } else if (setIsCreatingProject) {
         setIsCreatingProject(true); // Go back to creation form (if applicable)
     } else {
         router.push('/'); // Fallback to home
     }
   };


  if (!projectDetails) {
    return <div>Cargando detalles del proyecto...</div>;
  }

  return (
     <DndProvider backend={HTML5Backend}>
        <div>
          <h2 className="text-xl font-bold mb-4">Revisar Planificación Inicial - {projectDetails.projectName}</h2>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 border-b pb-1">Planificación Generada</h3>
             {editablePlan && editablePlan.length > 0 ? (
                <Table>
                  <TableCaption>Arrastra las filas para reordenar las fases.</TableCaption>
                  <TableHeader>
                    <TableRow>
                       <TableHead className="w-10"></TableHead> {/* Handle column */}
                      <TableHead className="min-w-[200px]">Fase</TableHead>
                      <TableHead className="w-[180px]">Duración Estimada (días)</TableHead>
                      <TableHead className="w-[200px]">Costo Estimado ({projectDetails.currency})</TableHead>
                      <TableHead className="w-[60px] text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editablePlan.map((phase, index) => (
                      <DraggableTableRow
                        key={phase.phaseId || index}
                        index={index}
                        phase={phase}
                        moveRow={moveRow}
                        handlePhaseNameChange={handlePhaseNameChange}
                        handleDurationChange={handleDurationChange}
                        handleCostChange={handleCostChange}
                        handleDeletePhase={handleDeletePhase}
                        currency={projectDetails.currency}
                      />
                    ))}
                  </TableBody>
                </Table>
            ) : (
                <p className="text-muted-foreground italic">Aún no se han agregado fases a este plan.</p>
            )}
            <Button variant="secondary" onClick={handleAddPhase} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Fase
            </Button>
          </div>


          <div className="mb-6">
             <h3 className="text-lg font-semibold mb-2 border-b pb-1">Resumen del Presupuesto</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <p className="font-medium">Presupuesto Total Ingresado:</p>
                <p className="text-right">{projectDetails.totalBudget.toLocaleString()} {projectDetails.currency}</p>
                <p className="font-medium">Costo Estimado Planificación:</p>
                 <p className={`text-right ${totalCost > projectDetails.totalBudget ? 'text-destructive font-semibold' : ''}`}>
                    {totalCost.toLocaleString()} {projectDetails.currency}
                 </p>
            </div>
             {totalCost > projectDetails.totalBudget && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>¡Atención!</AlertTitle>
                  <AlertDescription>El costo estimado total de la planificación excede el presupuesto inicial.</AlertDescription>
                </Alert>
              )}
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={handleGoBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar y Continuar'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
    </DndProvider>
  );
};

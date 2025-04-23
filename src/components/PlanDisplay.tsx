'use client';

import React, {useState, useEffect} from 'react';
import {ProjectDetails, InitialPlan} from '@/types';
import {Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {ArrowRight, ArrowLeft, AlertCircle, Trash2, Plus} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useToast} from '@/hooks/use-toast';

interface PlanDisplayProps {
  projectDetails: ProjectDetails;
  initialPlan: InitialPlan[] | null;
  projectId: string | null;
}

export const PlanDisplay: React.FC<PlanDisplayProps> = ({projectDetails, initialPlan, projectId}) => {
  const [editablePlan, setEditablePlan] = useState<InitialPlan[] | null>(initialPlan);
  const [totalCost, setTotalCost] = useState(0);
  const router = useRouter();
   const { toast } = useToast();

  useEffect(() => {
    if (editablePlan) {
      const calculatedTotalCost = editablePlan.reduce((sum, phase) => sum + phase.estimatedCost, 0);
      setTotalCost(calculatedTotalCost);
    }
  }, [editablePlan]);

  const handleCostChange = (index: number, newCost: number) => {
    if (editablePlan) {
      const updatedPlan = [...editablePlan];
      updatedPlan[index] = {...updatedPlan[index], estimatedCost: newCost};
      setEditablePlan(updatedPlan);
    }
  };

  const handleDurationChange = (index: number, newDuration: number) => {
    if (editablePlan) {
      const updatedPlan = [...editablePlan];
      updatedPlan[index] = {...updatedPlan[index], estimatedDuration: newDuration};
      setEditablePlan(updatedPlan);
    }
  };

  const handlePhaseNameChange = (index: number, newName: string) => {
    if (editablePlan) {
      const updatedPlan = [...editablePlan];
      updatedPlan[index] = {...updatedPlan[index], phaseName: newName};
      setEditablePlan(updatedPlan);
    }
  };

  const handleAddPhase = () => {
    if (editablePlan) {
      const newPhase: InitialPlan = {phaseId: crypto.randomUUID(), phaseName: 'Nueva Fase', estimatedDuration: 1, estimatedCost: 1000};
      setEditablePlan([...editablePlan, newPhase]);
    }
  };

  const handleDeletePhase = (index: number) => {
    if (editablePlan) {
      const updatedPlan = [...editablePlan];
      updatedPlan.splice(index, 1);
      setEditablePlan(updatedPlan);
    }
  };

  const handleSave = async () => {
    if (!projectId || !editablePlan) {
      console.error('Project ID or editable plan is missing.');
       toast({
          variant: 'destructive',
          title: 'Error al guardar el plan',
          description: 'El ID del proyecto o el plan editable no están presentes.',
        });
      return;
    }

    try {
      const response = await fetch('/api/generate-plan', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({projectId: projectId, initialPlan: editablePlan}),
      });

      if (!response.ok) {
         const errorData = await response.json();
        throw new Error(errorData.message || 'Fallo al actualizar el plan inicial');
      }

      console.log('Plan saved successfully');
       toast({
          title: 'Plan Guardado',
          description: '¡Plan guardado exitosamente!',
        });
      router.push('/');
    } catch (error: any) {
      console.error('Error al guardar el plan:', error);
       toast({
          variant: 'destructive',
          title: 'Error al guardar el plan',
          description: error.message || 'Fallo al guardar el plan.',
        });
    }
  };

  if (!projectDetails || !initialPlan) {
    return <div>No hay detalles del proyecto o plan inicial disponible.</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Revisar Planificación Inicial</h2>
      <h3 className="text-lg font-semibold mt-2">Planificación Inicial Generada</h3>
      <Table>
        <TableCaption>Lista de las fases de tu proyecto.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Fase</TableHead>
            <TableHead className="w-[150px]">Duración Estimada (días)</TableHead>
            <TableHead>Costo Estimado ({projectDetails.currency})</TableHead>
            <TableHead className="w-[50px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {editablePlan &&
            editablePlan.map((phase, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Input
                    type="text"
                    value={phase.phaseName || ''}
                    onChange={(e) =>
                      handlePhaseNameChange(index, e.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={phase.estimatedDuration?.toString() || ''}
                    onChange={(e) =>
                      handleDurationChange(index, Number(e.target.value))
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={phase.estimatedCost?.toString() || ''}
                    onChange={(e) => handleCostChange(index, Number(e.target.value))}
                  />
                </TableCell>
                <TableCell>
                  <Button variant="destructive" size="icon" onClick={() => handleDeletePhase(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <Button variant="secondary" onClick={handleAddPhase} className="mt-2">
        <Plus className="mr-2 h-4 w-4" />
        Agregar Fase
      </Button>

      <h3 className="text-lg font-semibold mt-4">Resumen del Presupuesto</h3>
      <p>Presupuesto Total Ingresado: {projectDetails.totalBudget} {projectDetails.currency}</p>
      <p>Costo Estimado Total de la Planificación: {totalCost} {projectDetails.currency}</p>
      {totalCost > projectDetails.totalBudget && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>¡Atención!</AlertTitle>
          <AlertDescription>El costo estimado total de la planificación excede el presupuesto inicial.</AlertDescription>
        </Alert>
      )}

      <div className="mt-4 flex justify-between">
        <Button variant="secondary">
          <ArrowLeft className="mr-2" />
          Volver
        </Button>
        <Button onClick={handleSave}>
          Guardar Planificación y Continuar
          <ArrowRight className="ml-2" />
        </Button>
      </div>
    </div>
  );
};

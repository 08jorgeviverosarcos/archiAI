'use client';

import React, {useState, useEffect} from 'react';
import {ProjectDetails, InitialPlan} from '@/types';
import {Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {ArrowRight, ArrowLeft, AlertCircle} from 'lucide-react';

interface PlanDisplayProps {
  projectDetails: ProjectDetails;
  initialPlan: InitialPlan[] | null;
}

export const PlanDisplay: React.FC<PlanDisplayProps> = ({projectDetails, initialPlan}) => {
  const [editablePlan, setEditablePlan] = useState<InitialPlan[] | null>(initialPlan);
  const [totalCost, setTotalCost] = useState(0);

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

  if (!projectDetails || !initialPlan) {
    return <div>No project details or initial plan available.</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Revisar Planificación Inicial</h2>
      <h3 className="text-lg font-semibold mt-2">Planificación Inicial Generada</h3>
      <Table>
        <TableCaption>A list of your project phases.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Fase</TableHead>
            <TableHead>Duración Estimada (días)</TableHead>
            <TableHead>Costo Estimado ({projectDetails.currency})</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {editablePlan &&
            editablePlan.map((phase, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Input
                    type="text"
                    value={phase.phaseName}
                    onChange={(e) =>
                      handlePhaseNameChange(index, e.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={phase.estimatedDuration}
                    onChange={(e) =>
                      handleDurationChange(index, Number(e.target.value))
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={phase.estimatedCost}
                    onChange={(e) => handleCostChange(index, Number(e.target.value))}
                  />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

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
        <Button>
          Guardar Planificación y Continuar
          <ArrowRight className="ml-2" />
        </Button>
      </div>
    </div>
  );
};

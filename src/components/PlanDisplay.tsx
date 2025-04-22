'use client';

import React, {useState, useEffect} from 'react';
import {ProjectDetails, InitialPlan} from '@/types';
import {Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';

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

  if (!projectDetails || !initialPlan) {
    return <div>No project details or initial plan available.</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Project Plan</h2>
      <Table>
        <TableCaption>A list of your project phases.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Phase</TableHead>
            <TableHead>Estimated Duration (days)</TableHead>
            <TableHead>Estimated Cost ({projectDetails.currency})</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {editablePlan &&
            editablePlan.map((phase, index) => (
              <TableRow key={index}>
                <TableCell>{phase.phaseName}</TableCell>
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

      <h3 className="text-lg font-semibold mt-4">Budget Summary</h3>
      <p>Total Budget: {projectDetails.totalBudget} {projectDetails.currency}</p>
      <p>Total Estimated Cost: {totalCost} {projectDetails.currency}</p>
      {totalCost > projectDetails.totalBudget && (
        <p className="text-red-500">
          Warning: Total estimated cost exceeds the total budget!
        </p>
      )}
      <Button className="mt-4">Save Plan</Button>
    </div>
  );
};

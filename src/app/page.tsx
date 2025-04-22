'use client';

import {useState} from 'react';
import {ProjectDetailsForm} from '@/components/ProjectDetailsForm';
import {PlanDisplay} from '@/components/PlanDisplay';
import {InitialPlan, ProjectDetails} from '@/types';

export default function Home() {
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [initialPlan, setInitialPlan] = useState<InitialPlan[] | null>(null);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">ArchiPlanAI</h1>
      {!projectDetails ? (
        <ProjectDetailsForm setProjectDetails={setProjectDetails} setInitialPlan={setInitialPlan} />
      ) : (
        <PlanDisplay projectDetails={projectDetails} initialPlan={initialPlan} />
      )}
    </div>
  );
}

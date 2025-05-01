'use client';

import React, { useState, useEffect } from 'react';
import { ProjectDetailsForm } from '@/components/ProjectDetailsForm';
import { PlanDisplay } from '@/components/PlanDisplay';
import { ProjectSelector } from '@/components/ProjectSelector'; // New component
import { ProjectDetails, InitialPlan as InitialPlanType } from '@/types'; // Use specific type
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react'; // Import ArrowLeft
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [projects, setProjects] = useState<ProjectDetails[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectDetails | null>(null);
  const [initialPlan, setInitialPlan] = useState<InitialPlanType[] | null>(null);
  const [initialPlanId, setInitialPlanId] = useState<string | null>(null); // Store InitialPlan ID
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false); // State to show/hide creation form
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch projects when the component mounts
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/projects'); // API route to get projects
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        setProjects(data.projects || []);
      } catch (err: any) {
        console.error("Error fetching projects:", err);
        setError('Could not load projects. Please try again later.');
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudieron cargar los proyectos.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [toast]); // Added toast to dependency array

  // Fetch initial plan when a project is selected
  useEffect(() => {
    const fetchInitialPlan = async () => {
      if (selectedProject?._id && selectedProject?.initialPlanId) {
        setIsLoading(true); // Show loading when fetching plan
        try {
          // Fetch the specific InitialPlan document using its ID
          const response = await fetch(`/api/initial-plans/${selectedProject.initialPlanId}`);
           if (!response.ok) {
              // Handle case where plan is not found or other errors
              if (response.status === 404) {
                 setInitialPlan(null); // No plan found for this project yet
                 setInitialPlanId(selectedProject.initialPlanId); // Still need the ID to potentially save later
                 console.warn(`Initial plan not found for project ${selectedProject._id}, ID: ${selectedProject.initialPlanId}`);
              } else {
                 throw new Error(`Failed to fetch initial plan: ${response.statusText}`);
              }
           } else {
                const planData = await response.json();
                setInitialPlan(planData.initialPlan?.phases || null); // Assuming API returns { initialPlan: { phases: [...] } }
                setInitialPlanId(planData.initialPlan?._id || selectedProject.initialPlanId); // Use fetched ID or fallback
           }

        } catch (err: any) {
          console.error("Error fetching initial plan:", err);
           toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo cargar la planificación inicial.",
            });
          setInitialPlan(null); // Reset plan on error
          setInitialPlanId(null);
        } finally {
            setIsLoading(false);
        }
      } else if (selectedProject && !selectedProject.initialPlanId) {
          // Handle cases where the project exists but the initialPlan link is missing or null
          console.warn(`Project ${selectedProject._id} does not have an associated initialPlanId.`);
          setInitialPlan(null);
          setInitialPlanId(null);
          setIsLoading(false); // Ensure loading stops
      }
    };

    fetchInitialPlan();
  }, [selectedProject, toast]); // Depend on selectedProject and toast

  // Handler for selecting a project
  const handleSelectProject = (project: ProjectDetails) => {
    setSelectedProject(project);
    setIsCreatingProject(false); // Hide creation form if it was open
    setInitialPlan(null); // Reset plan display until it's fetched
    setInitialPlanId(null);
  };

  // Handler for starting project creation
  const handleCreateNewProject = () => {
    setSelectedProject(null); // Deselect any current project
    setIsCreatingProject(true); // Show the creation form
    setInitialPlan(null);
    setInitialPlanId(null);
  };

  // Render different states based on loading, error, and selection
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Cargando...</span>
        </div>
      );
    }

    if (error) {
      return <p className="text-center text-destructive">{error}</p>;
    }

    // If a project is selected, show the PlanDisplay
    if (selectedProject) {
        // Pass initialPlanId and projectId
      return (
        <PlanDisplay
          projectDetails={selectedProject}
          initialPlan={initialPlan}
          initialPlanId={initialPlanId}
          projectId={selectedProject._id || null} // Pass MongoDB _id as projectId
          setSelectedProject={setSelectedProject} // Pass setter to allow going back
        />
      );
    }

    // If creating a new project, show the form
    if (isCreatingProject) {
      return (
        <ProjectDetailsForm
            // Pass necessary setters
            setProjectDetails={setSelectedProject} // Set the newly created project as selected
            setInitialPlan={setInitialPlan}
            setInitialPlanId={setInitialPlanId}
            setProjectId={(id) => { /* Maybe update selectedProject? */ }} // projectId is part of selectedProject._id now
            setIsCreatingProject={setIsCreatingProject} // To hide form on success/cancel
        />
      );
    }

    // If no project selected and not creating, show the ProjectSelector or creation prompt
    return (
        <>
            <h1 className="text-3xl font-bold mb-6 text-center">ArchiPlanAI</h1>
            {projects.length > 0 ? (
             <ProjectSelector projects={projects} onSelectProject={handleSelectProject} />
            ) : (
             <p className="text-center text-muted-foreground">No tienes proyectos creados.</p>
            )}
            <div className="mt-6 text-center">
                 <Button onClick={handleCreateNewProject}>
                   Crear Nuevo Proyecto
                 </Button>
            </div>
        </>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
        {/* Conditionally render Back button if creating or viewing a plan */}
       {(isCreatingProject || selectedProject) && !isLoading && (
         <Button
           variant="outline"
           size="sm"
           onClick={() => {
             setIsCreatingProject(false);
             setSelectedProject(null);
             setInitialPlan(null);
             setInitialPlanId(null);
           }}
           className="mb-4"
         >
           <ArrowLeft className="mr-2 h-4 w-4" /> Volver a la Selección
         </Button>
       )}
      {renderContent()}
    </div>
  );
}

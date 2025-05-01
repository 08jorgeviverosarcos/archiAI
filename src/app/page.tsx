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
  const [isLoading, setIsLoading] = useState(true); // Start loading initially for project fetch
  const [isCreatingProject, setIsCreatingProject] = useState(false); // State to show/hide creation form
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch projects when the component mounts
  useEffect(() => {
    const fetchProjects = async () => {
      console.log("Fetching projects...");
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/projects'); // API route to get projects
        console.log("Projects API response status:", response.status);
        if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("Fetched projects data:", data);
        setProjects(data.projects || []);
        if (!data.projects || data.projects.length === 0) {
            console.log("No projects found, setting isCreatingProject to true");
            // If no projects exist, default to the creation form
            // setIsCreatingProject(true); // Commenting out for now to show selector/creation prompt first
        }
      } catch (err: any) {
        console.error("Error fetching projects:", err);
        setError('Could not load projects. Please try again later.');
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudieron cargar los proyectos.",
        });
      } finally {
        console.log("Finished fetching projects, setting isLoading to false");
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [toast]); // Added toast to dependency array

  // Fetch initial plan when a project is selected
  useEffect(() => {
    const fetchInitialPlan = async () => {
      if (selectedProject?._id && selectedProject?.initialPlanId) {
        console.log(`Fetching initial plan for project ${selectedProject._id} with plan ID ${selectedProject.initialPlanId}`);
        setIsLoading(true); // Show loading when fetching plan
        setError(null); // Clear previous errors
        setInitialPlan(null); // Clear previous plan
        setInitialPlanId(null); // Clear previous plan ID
        try {
          // Fetch the specific InitialPlan document using its ID
          const response = await fetch(`/api/initial-plans/${selectedProject.initialPlanId}`);
           console.log(`Initial plan API response status for ID ${selectedProject.initialPlanId}:`, response.status);
           if (!response.ok) {
              // Handle case where plan is not found or other errors
              if (response.status === 404) {
                 setInitialPlan(null); // No plan found for this project yet
                 setInitialPlanId(selectedProject.initialPlanId); // Might still need the ID if a plan needs creating/saving later
                 console.warn(`Initial plan not found for project ${selectedProject._id}, ID: ${selectedProject.initialPlanId}`);
                 toast({
                     variant: "default", // Use default variant for info
                     title: "Planificación no encontrada",
                     description: "No se encontró una planificación inicial guardada para este proyecto.",
                 });
              } else {
                 let errorMsg = `Failed to fetch initial plan: ${response.statusText}`;
                 try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                 } catch (e) { /* Ignore if response is not JSON */ }
                 throw new Error(errorMsg);
              }
           } else {
                const planData = await response.json();
                console.log("Fetched Initial Plan Data:", JSON.stringify(planData, null, 2)); // Log fetched data
                // Ensure the structure is correct and phases exist
                if (planData && planData.initialPlan && Array.isArray(planData.initialPlan.phases)) {
                    // Sort phases by order before setting state
                    const sortedPhases = [...planData.initialPlan.phases].sort((a, b) => a.order - b.order);
                    setInitialPlan(sortedPhases);
                    setInitialPlanId(planData.initialPlan._id || selectedProject.initialPlanId); // Use fetched ID or fallback
                    console.log("Successfully set initial plan state with sorted phases:", sortedPhases);
                } else {
                    console.warn("Fetched plan data is missing expected structure or phases array:", planData);
                    setInitialPlan(null);
                    setInitialPlanId(selectedProject.initialPlanId); // Keep ID reference
                     toast({
                         variant: "default",
                         title: "Planificación Vacía",
                         description: "La planificación inicial existe pero no contiene fases.",
                     });
                }
           }

        } catch (err: any) {
          console.error("Error fetching initial plan:", err);
           toast({
                variant: "destructive",
                title: "Error",
                description: `No se pudo cargar la planificación inicial: ${err.message}`,
            });
          setInitialPlan(null); // Reset plan on error
          setInitialPlanId(null);
          setError(`Failed to load initial plan: ${err.message}`); // Set error state
        } finally {
            console.log("Finished fetching initial plan, setting isLoading to false");
            setIsLoading(false);
        }
      } else if (selectedProject && !selectedProject.initialPlanId) {
          // Handle cases where the project exists but the initialPlan link is missing or null
          console.warn(`Project ${selectedProject._id} does not have an associated initialPlanId.`);
          setInitialPlan(null);
          setInitialPlanId(null);
          setIsLoading(false); // Ensure loading stops
           toast({
               variant: "default",
               title: "Sin Planificación Asociada",
               description: "Este proyecto aún no tiene una planificación inicial asociada.",
           });
      } else {
           // If no project is selected, ensure loading is false
           if (!selectedProject) {
               setIsLoading(false);
           }
      }
    };

    fetchInitialPlan();
  }, [selectedProject, toast]); // Depend on selectedProject and toast

  // Handler for selecting a project
  const handleSelectProject = (project: ProjectDetails) => {
    console.log("Project selected:", project);
    setSelectedProject(project);
    setIsCreatingProject(false); // Hide creation form if it was open
    setInitialPlan(null); // Reset plan display until it's fetched
    setInitialPlanId(null);
    setError(null); // Clear errors when selecting a new project
  };

  // Handler for starting project creation
  const handleCreateNewProject = () => {
    console.log("Create new project button clicked");
    setSelectedProject(null); // Deselect any current project
    setIsCreatingProject(true); // Show the creation form
    setInitialPlan(null);
    setInitialPlanId(null);
    setError(null); // Clear errors
  };

    // Function to handle successful project creation
    const handleProjectCreated = (newProject: ProjectDetails, plan: InitialPlanType[] | null, planId: string | null) => {
        console.log("Project created callback:", newProject, plan, planId);
        // Add the new project to the list locally or refetch
        setProjects(prev => [newProject, ...prev]);
        setSelectedProject(newProject); // Select the newly created project
        setInitialPlan(plan);
        setInitialPlanId(planId);
        setIsCreatingProject(false); // Hide the form
    };


  // Render different states based on loading, error, and selection
  const renderContent = () => {
    // Initial loading state while fetching projects
    if (isLoading && !selectedProject && !isCreatingProject && projects.length === 0) {
        return (
            <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Cargando proyectos...</span>
            </div>
        );
    }

    // Loading state when fetching a specific plan
    if (isLoading && selectedProject) {
       return (
        <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Cargando planificación...</span>
        </div>
        );
    }

    // Display error if project fetch failed
    if (error && !selectedProject && !isCreatingProject) {
        return <p className="text-center text-destructive">{error}</p>;
    }

    // If a project is selected, show the PlanDisplay
    if (selectedProject) {
        // Pass initialPlanId and projectId
        // Also handle the case where plan is still loading or failed to load
         if (isLoading) { // Still loading plan
             return (
                <div className="flex justify-center items-center min-h-[200px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Cargando planificación...</span>
                </div>
             );
         }
         // Check for error specific to plan loading
         if (error && initialPlan === null) {
            return (
                <div className="text-center">
                    <p className="text-destructive mb-4">Error al cargar la planificación: {error}</p>
                    {/* Optionally add a retry button */}
                </div>
            );
         }
         // Plan loaded (or not found but no error), show display
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
            onProjectCreated={handleProjectCreated} // Use the callback
            setIsCreatingProject={setIsCreatingProject} // To hide form on success/cancel
        />
      );
    }

    // If no project selected and not creating, show the ProjectSelector or creation prompt
    // This state is reached after initial project loading is complete
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
             console.log("Back button clicked");
             setIsCreatingProject(false);
             setSelectedProject(null);
             setInitialPlan(null);
             setInitialPlanId(null);
             setError(null); // Clear errors when going back
             // No need to refetch projects here unless explicitly needed
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

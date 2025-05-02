'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // Import useSearchParams and useRouter
import { ProjectDetailsForm } from '@/components/ProjectDetailsForm';
import { PlanDisplay } from '@/components/PlanDisplay';
import { ProjectSelector } from '@/components/ProjectSelector'; // New component
import { ProjectDetails, InitialPlan as InitialPlanType } from '@/types'; // Use specific type
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react'; // Import ArrowLeft
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Get query parameters
  const editProjectId = searchParams.get('edit'); // Check for 'edit' parameter

  const [projects, setProjects] = useState<ProjectDetails[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectDetails | null>(null);
  const [initialPlan, setInitialPlan] = useState<InitialPlanType[] | null>(null);
  const [initialPlanId, setInitialPlanId] = useState<string | null>(null); // Store InitialPlan _id
  const [isLoading, setIsLoading] = useState(true); // Start loading initially
  const [isCreatingProject, setIsCreatingProject] = useState(false); // State to show/hide creation form
  const [isEditingProject, setIsEditingProject] = useState(!!editProjectId); // State to track edit mode
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch project details based on ID
  const fetchProjectById = useCallback(async (projectId: string) => {
      console.log(`Fetching project details for editing: ${projectId}`);
      setIsLoading(true);
      setError(null);
      try {
          const projectRes = await fetch(`/api/projects/${projectId}`);
          if (!projectRes.ok) {
              let errorMsg = 'Failed to fetch project for editing';
              try {
                  const errorData = await projectRes.json();
                  errorMsg = errorData.message || errorMsg;
              } catch (e) {/* ignore */}
              throw new Error(errorMsg);
          }
          const projectData = await projectRes.json();
          console.log('Fetched project data for editing:', projectData);
          if (projectData.project) {
            setSelectedProject(projectData.project); // This will trigger the plan fetch useEffect
            setIsCreatingProject(false); // Ensure creation form is hidden
            setIsEditingProject(true); // We are in edit mode
          } else {
             throw new Error('Project not found.');
          }
      } catch (err: any) {
          console.error("Error fetching project for editing:", err);
          setError(`Could not load project for editing: ${err.message}`);
          toast({
              variant: "destructive",
              title: "Error",
              description: `No se pudo cargar el proyecto para editar: ${err.message}`,
          });
          setSelectedProject(null); // Reset selection
          setIsEditingProject(false); // Exit edit mode on error
          router.replace('/'); // Remove query param if project fetch fails
      } finally {
           // Let the plan fetching handle the final isLoading state
      }
  }, [router, toast]); // Added router and toast

  // Fetch list of projects when the component mounts or edit mode changes
  useEffect(() => {
      // Only fetch all projects if not in edit mode initially
      if (!isEditingProject) {
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
                      console.log("No projects found.");
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
      }
  }, [isEditingProject, toast]); // Re-run if edit mode changes


  // Effect to handle initial loading based on query parameter
  useEffect(() => {
      if (editProjectId && !selectedProject) { // Check if we have an edit ID but no project loaded yet
          fetchProjectById(editProjectId);
      } else {
          setIsLoading(false); // If no edit ID, loading depends on project list fetch
      }
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editProjectId, fetchProjectById]); // Run when editProjectId changes

  // Fetch initial plan when a project is selected (either by clicking or via edit mode)
  useEffect(() => {
    const fetchInitialPlan = async () => {
      if (selectedProject?._id) { // Check if a project is selected
        const projectId = selectedProject._id;
        console.log(`Fetching initial plan using project ID: ${projectId}`);
        setIsLoading(true); // Show loading when fetching plan
        setError(null); // Clear previous errors
        setInitialPlan(null); // Clear previous plan phases
        setInitialPlanId(null); // Clear previous plan ID
        try {
          // Fetch the InitialPlan document using the projectId
          const response = await fetch(`/api/initial-plans/${projectId}`);
          console.log(`Initial plan API response status for project ID ${projectId}:`, response.status);

          if (!response.ok) {
            if (response.status === 404) {
              setInitialPlan(null); // No plan found
              setInitialPlanId(null);
              console.warn(`Initial plan not found for project ${projectId}`);
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
            console.log("Fetched Initial Plan Data:", JSON.stringify(planData, null, 2));

            if (planData && planData.initialPlan && Array.isArray(planData.initialPlan.phases)) {
              const sortedPhases = [...planData.initialPlan.phases].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
              setInitialPlan(sortedPhases);
              setInitialPlanId(planData.initialPlan._id);
              console.log("Successfully set initial plan state with sorted phases:", sortedPhases);
            } else {
              console.warn("Fetched plan data is missing expected structure or phases array:", planData);
              setInitialPlan(null);
              setInitialPlanId(null);
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
      } else {
        // If no project is selected, ensure loading is false
         if (!selectedProject) {
            // Only set loading false if we are not expecting an edit load
             if (!editProjectId) {
                 setIsLoading(false);
             }
         }
      }
    };

    fetchInitialPlan();
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, toast]); // Depend on selectedProject and toast

  // Handler for selecting a project from the list
  const handleSelectProject = (project: ProjectDetails) => {
    console.log("Project selected:", project);
    setSelectedProject(project);
    setIsCreatingProject(false); // Hide creation form
    setIsEditingProject(false); // Not in specific edit mode from URL
    setInitialPlan(null); // Reset plan display until it's fetched
    setInitialPlanId(null);
    setError(null); // Clear errors
  };

  // Handler for starting project creation
  const handleCreateNewProject = () => {
    console.log("Create new project button clicked");
    setSelectedProject(null); // Deselect any current project
    setIsCreatingProject(true); // Show the creation form
    setIsEditingProject(false); // Not in edit mode
    setInitialPlan(null);
    setInitialPlanId(null);
    setError(null); // Clear errors
  };

  // Function to handle successful project creation
  const handleProjectCreated = (newProject: ProjectDetails, plan: InitialPlanType[] | null, planId: string | null) => {
    console.log("Project created callback:", newProject, plan, planId);
    // Add the new project to the list locally or refetch
    setProjects(prev => [newProject, ...prev].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))); // Sort by creation date
    setSelectedProject(newProject); // Select the newly created project
    setInitialPlan(plan);
    setInitialPlanId(planId);
    setIsCreatingProject(false); // Hide the form
    setIsEditingProject(false); // Exit creation mode
  };

  // Function to handle going back to project selection/list
  const handleGoBackToList = useCallback(() => {
      console.log("Back button clicked");
      setSelectedProject(null);
      setInitialPlan(null);
      setInitialPlanId(null);
      setIsCreatingProject(false);
      setIsEditingProject(false); // Exit edit mode
      setError(null); // Clear errors
      router.replace('/'); // Remove query param when going back
      // Refetch projects if needed, or rely on existing list state
      // You might want to refetch if data could have changed significantly
      // fetchProjects(); // Uncomment if refetch is desired
  }, [router]); // Added router

  // Render different states based on loading, error, and selection
  const renderContent = () => {
    // Initial loading state (covers both project list and edit project fetch)
    if (isLoading) {
        const message = isEditingProject ? 'Cargando proyecto para editar...' : 'Cargando proyectos...';
        return (
            <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">{message}</span>
            </div>
        );
    }

    // Display error if project fetch failed
    if (error && !selectedProject && !isCreatingProject) {
        return <p className="text-center text-destructive">{error}</p>;
    }

    // If a project is selected (viewing plan, either new or existing) or in edit mode
    if (selectedProject || isEditingProject) {
        // If still loading the plan for the selected/editing project
        if (isLoading) {
            return (
                <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Cargando planificación...</span>
                </div>
            );
        }
         // If project is selected and plan is loaded (or attempted)
        if(selectedProject) {
            return (
                <PlanDisplay
                projectDetails={selectedProject}
                initialPlan={initialPlan}
                initialPlanId={initialPlanId}
                projectId={selectedProject._id || null}
                onGoBack={handleGoBackToList} // Use the back handler
                />
            );
        }
        // If in edit mode but project/plan loading failed or hasn't finished
        return <p className="text-center text-muted-foreground">Cargando detalles del proyecto...</p>;

    }


    // If creating a new project, show the form
    if (isCreatingProject) {
      return (
        <ProjectDetailsForm
            onProjectCreated={handleProjectCreated}
            onCancel={handleGoBackToList} // Use back handler for cancel
        />
      );
    }

    // Default view: Show ProjectSelector or creation prompt
    return (
        <>
            <h1 className="text-3xl font-bold mb-6 text-center">ArchiPlanAI</h1>
            {projects.length > 0 ? (
             <ProjectSelector projects={projects} onSelectProject={(p) => router.push(`/dashboard/${p._id}`)} />
            ) : !isLoading ? ( // Only show creation prompt if not loading and no projects
             <p className="text-center text-muted-foreground">No tienes proyectos creados.</p>
            ) : null /* Don't show anything while loading */}
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
       {/* Conditionally render Back button only when creating or editing */}
       {(isCreatingProject || isEditingProject) && !isLoading && (
         <Button
           variant="outline"
           size="sm"
           onClick={handleGoBackToList}
           className="mb-4"
         >
           <ArrowLeft className="mr-2 h-4 w-4" /> Volver a la Selección
         </Button>
       )}
      {renderContent()}
      <Toaster /> {/* Add Toaster component here */}
    </div>
  );
}

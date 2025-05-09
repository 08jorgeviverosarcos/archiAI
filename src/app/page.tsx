
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProjectDetailsForm } from '@/components/ProjectDetailsForm';
import { PlanDisplay } from '@/components/PlanDisplay';
import { ProjectSelector } from '@/components/ProjectSelector';
import { ProjectDetails, FrontendInitialPlanPhase, FrontendGeneratedPlanResponse } from '@/types'; // Updated types
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editProjectId = searchParams.get('edit');

  const [projects, setProjects] = useState<ProjectDetails[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectDetails | null>(null);
  // initialPlan state now expects FrontendInitialPlanPhase[] which includes tasks
  const [initialPlan, setInitialPlan] = useState<FrontendInitialPlanPhase[] | null>(null);
  const [initialPlanId, setInitialPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(!!editProjectId);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
            setSelectedProject(projectData.project);
            setIsCreatingProject(false);
            setIsEditingProject(true);
          } else {
             throw new Error('Proyecto no encontrado.');
          }
      } catch (err: any) {
          console.error("Error fetching project for editing:", err);
          setError(`No se pudo cargar el proyecto para editar: ${err.message}`);
          toast({
              variant: "destructive",
              title: "Error",
              description: `No se pudo cargar el proyecto para editar: ${err.message}`,
          });
          setSelectedProject(null);
          setIsEditingProject(false);
          router.replace('/');
      }
  }, [router, toast]);

  useEffect(() => {
      if (!isEditingProject) {
          const fetchProjects = async () => {
              console.log("Fetching projects...");
              setIsLoading(true);
              setError(null);
              try {
                  const response = await fetch('/api/projects');
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
                  setError('No se pudieron cargar los proyectos. Por favor, inténtelo de nuevo más tarde.');
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
  }, [isEditingProject, toast]);


  useEffect(() => {
      if (editProjectId && !selectedProject) {
          fetchProjectById(editProjectId);
      } else {
          setIsLoading(false);
      }
  }, [editProjectId, fetchProjectById, selectedProject]);

  useEffect(() => {
    const fetchInitialPlanAndTasks = async () => {
      if (selectedProject?._id) {
        const projectId = selectedProject._id;
        console.log(`Fetching initial plan with tasks using project ID: ${projectId}`);
        setIsLoading(true);
        setError(null);
        setInitialPlan(null);
        setInitialPlanId(null);
        try {
          const response = await fetch(`/api/initial-plans/${projectId}`); // This endpoint now needs to return phases with tasks
          console.log(`Initial plan (with tasks) API response status for project ID ${projectId}:`, response.status);

          if (!response.ok) {
            if (response.status === 404) {
              setInitialPlan(null);
              setInitialPlanId(null);
              console.warn(`Initial plan not found for project ${projectId}`);
              toast({
                variant: "default",
                title: "Planificación no encontrada",
                description: "No se encontró una planificación inicial guardada para este proyecto.",
              });
            } else {
              let errorMsg = `Failed to fetch initial plan: ${response.statusText}`;
              try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch (e) { /* Ignore */ }
              throw new Error(errorMsg);
            }
          } else {
            // Expecting response to be { initialPlan: InitialPlanDocument }
            // where InitialPlanDocument contains phases, and each phase *might* contain tasks if populated by backend.
            // The API /api/initial-plans/${projectId} GET now populates tasks for each phase.
            const planDataWrapper = await response.json();
            console.log("Fetched Initial Plan Document Data:", JSON.stringify(planDataWrapper, null, 2));

            if (planDataWrapper && planDataWrapper.initialPlan && Array.isArray(planDataWrapper.initialPlan.phases)) {
              const fetchedInitialPlanDoc = planDataWrapper.initialPlan;
              // Sort phases by order
              const sortedPhasesWithTasks = [...fetchedInitialPlanDoc.phases].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
              
              // The tasks are now populated by the backend in the initialPlan.phases array
              setInitialPlan(sortedPhasesWithTasks as FrontendInitialPlanPhase[]); // Cast as tasks are included
              setInitialPlanId(fetchedInitialPlanDoc._id);
              console.log("Successfully set initial plan state with sorted phases and their tasks:", sortedPhasesWithTasks);
            } else {
              console.warn("Fetched plan data is missing expected structure (initialPlan.phases array):", planDataWrapper);
              setInitialPlan(null);
              setInitialPlanId(null);
              toast({
                variant: "default",
                title: "Planificación Vacía",
                description: "La planificación inicial existe pero no contiene fases o tareas.",
              });
            }
          }

        } catch (err: any) {
          console.error("Error fetching initial plan with tasks:", err);
          toast({
            variant: "destructive",
            title: "Error",
            description: `No se pudo cargar la planificación inicial: ${err.message}`,
          });
          setInitialPlan(null);
          setInitialPlanId(null);
          setError(`Failed to load initial plan: ${err.message}`);
        } finally {
          console.log("Finished fetching initial plan, setting isLoading to false");
          setIsLoading(false);
        }
      } else {
         if (!selectedProject && !editProjectId) {
            setIsLoading(false);
         }
      }
    };
    fetchInitialPlanAndTasks();
  }, [selectedProject, editProjectId, toast]);

  const handleSelectProject = (project: ProjectDetails) => {
    console.log("Project selected:", project);
    setSelectedProject(project);
    setIsCreatingProject(false);
    setIsEditingProject(false);
    setInitialPlan(null);
    setInitialPlanId(null);
    setError(null);
    router.push(`/dashboard/${project._id}`); // Navigate to dashboard on project selection
  };

  const handleCreateNewProject = () => {
    console.log("Create new project button clicked");
    setSelectedProject(null);
    setIsCreatingProject(true);
    setIsEditingProject(false);
    setInitialPlan(null);
    setInitialPlanId(null);
    setError(null);
  };

  const handleProjectCreated = (newProject: ProjectDetails, planWithTasks: FrontendInitialPlanPhase[] | null, planId: string | null) => {
    console.log("Project created callback:", newProject, planWithTasks, planId);
    setProjects(prev => [newProject, ...prev].sort((a, b) => (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime())));
    setSelectedProject(newProject);
    setInitialPlan(planWithTasks); // planWithTasks now includes tasks
    setInitialPlanId(planId);
    setIsCreatingProject(false);
    setIsEditingProject(false); // Should be true if we want to edit the newly created plan
    // Potentially navigate to an edit view or dashboard:
    // router.push(`/?edit=${newProject._id}`); // To edit plan
    // OR
    // router.push(`/dashboard/${newProject._id}`); // To go to dashboard
  };

  const handleGoBackToList = useCallback(() => {
      console.log("Back button clicked");
      setSelectedProject(null);
      setInitialPlan(null);
      setInitialPlanId(null);
      setIsCreatingProject(false);
      setIsEditingProject(false);
      setError(null);
      router.replace('/');
  }, [router]);

  const renderContent = () => {
    if (isLoading) {
        const message = isEditingProject ? 'Cargando proyecto para editar...' : (isCreatingProject ? 'Preparando formulario...' : 'Cargando proyectos...');
        return (
            <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">{message}</span>
            </div>
        );
    }

    if (error && !selectedProject && !isCreatingProject) {
        return <p className="text-center text-destructive">{error}</p>;
    }

    if (selectedProject || isEditingProject) {
        if (isLoading) { // Still loading plan for selected/editing project
            return (
                <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Cargando planificación...</span>
                </div>
            );
        }
        if(selectedProject) { // Project selected, plan loaded (or attempted)
            return (
                <PlanDisplay
                projectDetails={selectedProject}
                initialPlan={initialPlan} // Pass the plan with tasks
                initialPlanId={initialPlanId}
                projectId={selectedProject._id || null}
                onGoBack={handleGoBackToList}
                />
            );
        }
        return <p className="text-center text-muted-foreground">Cargando detalles del proyecto...</p>;
    }

    if (isCreatingProject) {
      return (
        <ProjectDetailsForm
            onProjectCreated={handleProjectCreated}
            onCancel={handleGoBackToList}
        />
      );
    }

    return (
        <>
            <h1 className="text-3xl font-bold mb-6 text-center">ArchiPlanAI</h1>
            {projects.length > 0 ? (
             <ProjectSelector projects={projects} onSelectProject={handleSelectProject} />
            ) : !isLoading ? (
             <p className="text-center text-muted-foreground">No tienes proyectos creados.</p>
            ) : null}
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
      <Toaster />
    </div>
  );
}


'use client';

import React from 'react';
import { ProjectDetails } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, List } from 'lucide-react'; // Example icons

interface ProjectSelectorProps {
  projects: ProjectDetails[];
  onSelectProject: (project: ProjectDetails) => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ projects, onSelectProject }) => {
  if (!projects || projects.length === 0) {
    return <p className="text-center text-muted-foreground">No se encontraron proyectos.</p>;
  }

  return (
    <div className="space-y-4">
       <h2 className="text-2xl font-semibold mb-4">Selecciona un Proyecto</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card key={project._id || project.projectName} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 <Building className="h-5 w-5 text-primary" /> {/* Project Icon */}
                 {project.projectName}
              </CardTitle>
              <CardDescription>{project.projectType}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end">
              <Button size="sm" onClick={() => onSelectProject(project)}>
                 Abrir Dashboard
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

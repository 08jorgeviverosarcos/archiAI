'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, PackagePlus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { MaterialTask, MaterialProject } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface AssignMaterialToTaskDialogProps {
  taskId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onMaterialsUpdated: () => void; // Callback to refresh parent data if needed
}

interface MaterialTaskFormData {
  materialProjectId: string;
  quantityUsed: number;
}

export const AssignMaterialToTaskDialog: React.FC<AssignMaterialToTaskDialogProps> = ({
  taskId,
  projectId,
  isOpen,
  onClose,
  onMaterialsUpdated,
}) => {
  const { toast } = useToast();
  const [assignedMaterials, setAssignedMaterials] = useState<MaterialTask[]>([]);
  const [projectMaterials, setProjectMaterials] = useState<MaterialProject[]>([]);
  const [isLoadingAssigned, setIsLoadingAssigned] = useState(false);
  const [isLoadingProjectMaterials, setIsLoadingProjectMaterials] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedMaterialProject, setSelectedMaterialProject] = useState<string>('');
  const [quantityUsed, setQuantityUsed] = useState<number | string>('');

  const fetchAssignedMaterials = useCallback(async () => {
    if (!taskId) return;
    setIsLoadingAssigned(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/materials`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch assigned materials');
      }
      const data = await response.json();
      setAssignedMaterials(data.materialsForTask || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudieron cargar los materiales asignados: ${error.message}` });
    } finally {
      setIsLoadingAssigned(false);
    }
  }, [taskId, toast]);

  const fetchProjectMaterials = useCallback(async () => {
    if (!projectId) return;
    setIsLoadingProjectMaterials(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/materials`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch project materials');
      }
      const data = await response.json();
      setProjectMaterials(data.materials || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudieron cargar los materiales del proyecto: ${error.message}` });
    } finally {
      setIsLoadingProjectMaterials(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchAssignedMaterials();
      fetchProjectMaterials();
    }
  }, [isOpen, fetchAssignedMaterials, fetchProjectMaterials]);

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialProject || quantityUsed === '' || Number(quantityUsed) <= 0) {
      toast({ variant: 'destructive', title: 'Error de validación', description: 'Por favor seleccione un material y especifique una cantidad válida.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialProjectId: selectedMaterialProject, quantityUsed: Number(quantityUsed) }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign material');
      }
      const newMaterialTask = await response.json();
      toast({ title: 'Material Asignado', description: 'El material ha sido asignado a la tarea.' });
      setAssignedMaterials(prev => [...prev, newMaterialTask.materialTask]);
      setSelectedMaterialProject('');
      setQuantityUsed('');
      onMaterialsUpdated();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo asignar el material: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMaterial = async (materialTaskId: string) => {
    setIsSubmitting(true); // You might want a different loading state for deletion
    try {
      const response = await fetch(`/api/materials/task/${materialTaskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove material');
      }
      toast({ title: 'Material Eliminado', description: 'El material ha sido eliminado de la tarea.' });
      setAssignedMaterials(prev => prev.filter(mt => mt._id !== materialTaskId));
      onMaterialsUpdated();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo eliminar el material: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gestionar Materiales de Tarea</DialogTitle>
          <DialogDescription>
            Asigne o elimine materiales para esta tarea. Los materiales deben existir en el inventario general del proyecto.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow pr-6">
          <div className="space-y-6 py-4">
            {/* Form to add new material to task */}
            <form onSubmit={handleAddMaterial} className="space-y-4 p-4 border rounded-md">
              <h3 className="text-lg font-medium">Asignar Nuevo Material</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div className="space-y-1">
                  <Label htmlFor="material-select">Material del Proyecto</Label>
                  {isLoadingProjectMaterials ? (
                    <div className="flex items-center"> <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cargando...</div>
                  ) : projectMaterials.length > 0 ? (
                    <Select value={selectedMaterialProject} onValueChange={setSelectedMaterialProject}>
                      <SelectTrigger id="material-select">
                        <SelectValue placeholder="Seleccionar material" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectMaterials.map((material) => (
                          <SelectItem key={material._id} value={material._id!}>
                            {material.referenceCode} - {material.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay materiales en el proyecto. <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => {/* TODO: Navigate to project materials page or open a modal */} }>Agregar Materiales al Proyecto</Button></p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="quantity-used">Cantidad a Usar</Label>
                  <Input
                    id="quantity-used"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={quantityUsed}
                    onChange={(e) => setQuantityUsed(e.target.value)}
                    placeholder="Ej. 10.5"
                  />
                </div>
              </div>
              <Button type="submit" disabled={isSubmitting || isLoadingProjectMaterials || projectMaterials.length === 0}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PackagePlus className="h-4 w-4 mr-2" />}
                Asignar Material
              </Button>
            </form>

            {/* List of currently assigned materials */}
            <div>
              <h3 className="text-lg font-medium mb-2">Materiales Asignados a esta Tarea</h3>
              {isLoadingAssigned ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2">Cargando materiales asignados...</span>
                </div>
              ) : assignedMaterials.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cód. Ref.</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Cantidad Usada</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedMaterials.map((mt) => (
                      <TableRow key={mt._id}>
                        <TableCell>{(mt.materialProjectId as any)?.referenceCode || 'N/A'}</TableCell>
                        <TableCell>{(mt.materialProjectId as any)?.description || 'Descripción no disponible'}</TableCell>
                        <TableCell className="text-right">{mt.quantityUsed}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => mt._id && handleRemoveMaterial(mt._id)}
                            disabled={isSubmitting}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No hay materiales asignados a esta tarea.</p>
              )}
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

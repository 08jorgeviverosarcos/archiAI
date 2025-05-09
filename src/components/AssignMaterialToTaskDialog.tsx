'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, PackagePlus, Trash2, Edit } from 'lucide-react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface AssignMaterialToTaskDialogProps {
  taskId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onMaterialsUpdated: () => void;
}


interface MaterialTaskEditFormData {
  quantityUsed: number;
  profitMarginForTaskMaterial?: number | null;
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
  const [profitMargin, setProfitMargin] = useState<number | string>(''); // State for new material profit margin

  const [editingMaterialTask, setEditingMaterialTask] = useState<MaterialTask | null>(null);
  const [editFormData, setEditFormData] = useState<MaterialTaskEditFormData>({ quantityUsed: 0, profitMarginForTaskMaterial: null });


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
      setEditingMaterialTask(null); // Reset editing state when dialog opens
      setSelectedMaterialProject(''); // Reset form fields
      setQuantityUsed('');
      setProfitMargin('');
    }
  }, [isOpen, fetchAssignedMaterials, fetchProjectMaterials]);


  useEffect(() => {
    if (editingMaterialTask) {
      setEditFormData({
        quantityUsed: editingMaterialTask.quantityUsed,
        profitMarginForTaskMaterial: editingMaterialTask.profitMarginForTaskMaterial ?? null,
      });
    } else {
      setEditFormData({ quantityUsed: 0, profitMarginForTaskMaterial: null });
    }
  }, [editingMaterialTask]);


  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialProject || quantityUsed === '' || Number(quantityUsed) <= 0) {
      toast({ variant: 'destructive', title: 'Error de validación', description: 'Por favor seleccione un material y especifique una cantidad válida.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: { materialProjectId: string; quantityUsed: number; profitMarginForTaskMaterial?: number | null } = {
         materialProjectId: selectedMaterialProject,
         quantityUsed: Number(quantityUsed)
      };
      if (profitMargin !== '') {
        payload.profitMarginForTaskMaterial = Number(profitMargin);
      }


      const response = await fetch(`/api/tasks/${taskId}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign material');
      }
      await fetchAssignedMaterials(); // Refetch to get the latest list including populated fields
      toast({ title: 'Material Asignado', description: 'El material ha sido asignado a la tarea.' });
      setSelectedMaterialProject('');
      setQuantityUsed('');
      setProfitMargin('');
      onMaterialsUpdated();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo asignar el material: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
        ...prev,
        [name]: name === 'profitMarginForTaskMaterial' ? (value === '' ? null : Number(value)) : Number(value)
    }));
  };

  const handleSaveEditMaterialTask = async () => {
    if (!editingMaterialTask || !editingMaterialTask._id) return;
    if (editFormData.quantityUsed <=0) {
        toast({ variant: 'destructive', title: 'Error de validación', description: 'La cantidad usada debe ser mayor que cero.' });
        return;
    }

    setIsSubmitting(true);
    try {
      const payload:any = {
        quantityUsed: editFormData.quantityUsed,
      };
      // Only include profitMarginForTaskMaterial if it's not null or undefined
      // The backend schema allows null, so an empty string input should become null.
      if (editFormData.profitMarginForTaskMaterial === null || editFormData.profitMarginForTaskMaterial === undefined || editFormData.profitMarginForTaskMaterial === '') {
        payload.profitMarginForTaskMaterial = null;
      } else {
        payload.profitMarginForTaskMaterial = Number(editFormData.profitMarginForTaskMaterial);
      }


      const response = await fetch(`/api/materials/task/${editingMaterialTask._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update material task');
      }
      await fetchAssignedMaterials();
      toast({ title: 'Material de Tarea Actualizado', description: 'El material de la tarea ha sido actualizado.' });
      setEditingMaterialTask(null); // Close edit form
      onMaterialsUpdated();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo actualizar el material de la tarea: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleRemoveMaterial = async (materialTaskId: string) => {
    // Confirmation is handled by AlertDialog
    setIsSubmitting(true);
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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setEditingMaterialTask(null); } }}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gestionar Materiales de Tarea</DialogTitle>
          <DialogDescription>
            Asigne o elimine materiales para esta tarea.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow pr-6">
          <div className="space-y-6 py-4">
            {!editingMaterialTask ? (
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
                              {material.referenceCode} - {material.description} (Disp: {material.quantity} {material.unitOfMeasure})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">No hay materiales en el proyecto.</p>
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
                 <div className="space-y-1">
                    <Label htmlFor="profit-margin-new">Margen de Utilidad para esta tarea (%) (Opcional)</Label>
                    <Input
                      id="profit-margin-new"
                      type="number"
                      min="0"
                      step="0.1"
                      value={profitMargin}
                      onChange={(e) => setProfitMargin(e.target.value)}
                      placeholder="Ej. 10 (para 10%, si se deja vacío usará el del material)"
                    />
                  </div>
                <Button type="submit" disabled={isSubmitting || isLoadingProjectMaterials || projectMaterials.length === 0}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PackagePlus className="h-4 w-4 mr-2" />}
                  Asignar Material
                </Button>
              </form>
            ) : (
                // Edit Form
                <div className="space-y-4 p-4 border rounded-md">
                    <h3 className="text-lg font-medium">Editar Material Asignado: {(editingMaterialTask.materialProjectId as any)?.referenceCode}</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="edit-quantity-used">Cantidad Usada</Label>
                            <Input
                                id="edit-quantity-used"
                                name="quantityUsed"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={editFormData.quantityUsed}
                                onChange={handleEditInputChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-profit-margin">Margen de Utilidad (%)</Label>
                            <Input
                                id="edit-profit-margin"
                                name="profitMarginForTaskMaterial"
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="Ej: 10 (para 10%)"
                                value={editFormData.profitMarginForTaskMaterial ?? ''}
                                onChange={handleEditInputChange}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setEditingMaterialTask(null)} disabled={isSubmitting}>Cancelar Edición</Button>
                        <Button onClick={handleSaveEditMaterialTask} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Guardar Cambios
                        </Button>
                    </div>
                </div>
            )}


            <div>
              <h3 className="text-lg font-medium mb-2 mt-6">Materiales Asignados a esta Tarea</h3>
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
                      <TableHead className="text-right">Cant. Usada</TableHead>
                      <TableHead className="text-right">Costo Material</TableHead>
                      <TableHead className="text-right">Utilidad (%)</TableHead>
                       <TableHead className="text-right">Valor Compra Tarea</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedMaterials.map((mt) => (
                      <TableRow key={mt._id}>
                        <TableCell>{(mt.materialProjectId as any)?.referenceCode || 'N/A'}</TableCell>
                        <TableCell>{(mt.materialProjectId as any)?.description || 'N/A'}</TableCell>
                        <TableCell className="text-right">{mt.quantityUsed.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{mt.materialCostForTask?.toLocaleString() ?? 'N/A'}</TableCell>
                        <TableCell className="text-right">{mt.profitMarginForTaskMaterial?.toLocaleString() ?? '-'}%</TableCell>
                        <TableCell className="text-right">
                            {typeof (mt.materialProjectId as any)?.purchasedValue === 'number' && typeof mt.quantityUsed === 'number' && typeof (mt.materialProjectId as any)?.quantity === 'number' && (mt.materialProjectId as any)?.quantity !== 0
                                ? (((mt.materialProjectId as any).purchasedValue / (mt.materialProjectId as any).quantity) * mt.quantityUsed).toLocaleString()
                                : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                           <Button variant="ghost" size="icon" onClick={() => setEditingMaterialTask(mt)} disabled={isSubmitting || !!editingMaterialTask}>
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                           </Button>
                           <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={isSubmitting || !!editingMaterialTask}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                        <span className="sr-only">Eliminar</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Esto eliminará permanentemente el material asignado
                                        <span className="font-semibold"> {(mt.materialProjectId as any)?.referenceCode}</span> de esta tarea.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => mt._id && handleRemoveMaterial(mt._id)}>
                                        Eliminar
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
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
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={() => { onClose(); setEditingMaterialTask(null); }} disabled={isSubmitting}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

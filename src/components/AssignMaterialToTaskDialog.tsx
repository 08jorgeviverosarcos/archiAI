'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, PackagePlus, Trash2, Edit, Search, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { MaterialTask, MaterialProject as MaterialProjectType } from '@/types'; // Renamed MaterialProject to MaterialProjectType
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
import { MaterialProjectForm } from '@/components/MaterialProjectForm'; // Import MaterialProjectForm
import { formatNumberForInput, parseFormattedNumber } from '@/lib/formattingUtils';

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
  purchasedValueForTask?: number | null;
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
  const [projectMaterials, setProjectMaterials] = useState<MaterialProjectType[]>([]);
  const [isLoadingAssigned, setIsLoadingAssigned] = useState(false);
  const [isLoadingProjectMaterials, setIsLoadingProjectMaterials] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedMaterialProject, setSelectedMaterialProject] = useState<string>('');
  const [quantityUsed, setQuantityUsed] = useState<number | string>(''); 
  const [profitMargin, setProfitMargin] = useState<number | string>(''); 
  const [purchasedValueForTaskInput, setPurchasedValueForTaskInput] = useState<string>(''); 
  const [searchTerm, setSearchTerm] = useState('');


  const [editingMaterialTask, setEditingMaterialTask] = useState<MaterialTask | null>(null);
  const [editFormData, setEditFormData] = useState<MaterialTaskEditFormData>({ quantityUsed: 0, profitMarginForTaskMaterial: null, purchasedValueForTask: null });
  
  const [isCreateMaterialFormOpen, setIsCreateMaterialFormOpen] = useState(false); // State for nested dialog


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
      setEditingMaterialTask(null); 
      setSelectedMaterialProject(''); 
      setQuantityUsed('');
      setProfitMargin('');
      setPurchasedValueForTaskInput('');
      setSearchTerm('');
      setIsCreateMaterialFormOpen(false);
    }
  }, [isOpen, fetchAssignedMaterials, fetchProjectMaterials]);


  useEffect(() => {
    if (editingMaterialTask) {
      setEditFormData({
        quantityUsed: editingMaterialTask.quantityUsed,
        profitMarginForTaskMaterial: editingMaterialTask.profitMarginForTaskMaterial ?? null,
        purchasedValueForTask: editingMaterialTask.purchasedValueForTask ?? null,
      });
    } else {
      setEditFormData({ quantityUsed: 0, profitMarginForTaskMaterial: null, purchasedValueForTask: null });
    }
  }, [editingMaterialTask]);

  const filteredProjectMaterials = React.useMemo(() => {
    if (!searchTerm) {
      return projectMaterials;
    }
    return projectMaterials.filter(material =>
      (material.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (material.referenceCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (material.brand || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projectMaterials, searchTerm]);

  const handleSelectMaterialFromTable = (materialId: string) => {
    setSelectedMaterialProject(materialId);
  };

  const getSelectedMaterialDetails = () => {
    return projectMaterials.find(m => m._id === selectedMaterialProject);
  }


  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const numQuantityUsed = parseFormattedNumber(String(quantityUsed));

    if (!selectedMaterialProject || numQuantityUsed === null || numQuantityUsed <= 0) {
      toast({ variant: 'destructive', title: 'Error de validación', description: 'Por favor seleccione un material y especifique una cantidad válida.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const numProfitMargin = parseFormattedNumber(String(profitMargin));
      const numPurchasedValue = parseFormattedNumber(purchasedValueForTaskInput);

      const payload: { 
        materialProjectId: string; 
        quantityUsed: number; 
        profitMarginForTaskMaterial?: number | null;
        purchasedValueForTask?: number | null;
    } = {
         materialProjectId: selectedMaterialProject,
         quantityUsed: numQuantityUsed,
         profitMarginForTaskMaterial: numProfitMargin,
         purchasedValueForTask: numPurchasedValue
      };
      
      const response = await fetch(`/api/tasks/${taskId}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign material');
      }
      await fetchAssignedMaterials(); 
      toast({ title: 'Material Asignado', description: 'El material ha sido asignado a la tarea.' });
      setSelectedMaterialProject('');
      setQuantityUsed('');
      setProfitMargin('');
      setPurchasedValueForTaskInput('');
      setSearchTerm('');
      onMaterialsUpdated();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo asignar el material: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditInputChange = (fieldName: keyof MaterialTaskEditFormData, value: string) => {
    const parsedValue = parseFormattedNumber(value);
    
    setEditFormData(prev => ({
        ...prev,
        [fieldName]: fieldName === 'quantityUsed' ? (parsedValue ?? 0) : parsedValue
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
        profitMarginForTaskMaterial: editFormData.profitMarginForTaskMaterial,
        purchasedValueForTask: editFormData.purchasedValueForTask,
      };
      
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
      setEditingMaterialTask(null); 
      onMaterialsUpdated();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo actualizar el material de la tarea: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleRemoveMaterial = async (materialTaskId: string) => {
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

  const handleNewMaterialProjectCreated = (newMaterial: MaterialProjectType) => {
    fetchProjectMaterials(); // Refresh the list of project materials
    setIsCreateMaterialFormOpen(false); // Close the nested dialog
    toast({ title: 'Material de Proyecto Creado', description: `El material "${newMaterial.title}" ha sido creado.` });
    // Optionally, auto-select the new material:
    // setSelectedMaterialProject(newMaterial._id!); 
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setEditingMaterialTask(null); setSelectedMaterialProject(''); setSearchTerm(''); setIsCreateMaterialFormOpen(false); } }}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gestionar Materiales de Tarea</DialogTitle>
          <DialogDescription>
            Asigne o elimine materiales para esta tarea.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow py-4 pr-2">
          <div className="space-y-6"> 
            {!editingMaterialTask ? (
              <form onSubmit={handleAddMaterial} className="space-y-4 p-1">
                <h3 className="text-lg font-medium">Asignar Nuevo Material</h3>

                {!selectedMaterialProject ? (
                  <div className="space-y-2">
                    <div className='flex justify-between items-center'>
                        <Label htmlFor="material-search">Buscar Material</Label>
                        <Dialog open={isCreateMaterialFormOpen} onOpenChange={setIsCreateMaterialFormOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Crear Nuevo Material
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[750px] max-h-[90vh] flex flex-col">
                                <DialogHeader>
                                    <DialogTitle>Agregar Nuevo Material al Proyecto</DialogTitle>
                                </DialogHeader>
                                <MaterialProjectForm
                                    projectId={projectId}
                                    onMaterialSaved={handleNewMaterialProjectCreated}
                                    onCancel={() => setIsCreateMaterialFormOpen(false)}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Search className="h-5 w-5 text-muted-foreground" />
                        <Input
                        id="material-search"
                        type="text"
                        placeholder="Buscar por Título, Cód. Ref., Marca..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-grow"
                        />
                    </div>
                    {isLoadingProjectMaterials ? (
                      <div className="flex items-center justify-center py-4"> <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" /> Cargando...</div>
                    ) : filteredProjectMaterials.length > 0 ? (
                      <div className="border rounded-md max-h-60 overflow-y-auto mt-2">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Título</TableHead>
                              <TableHead>Cód. Ref.</TableHead>
                              <TableHead>Unidad</TableHead>
                              <TableHead className="text-right">Acción</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredProjectMaterials.map((material) => (
                              <TableRow key={material._id}>
                                <TableCell>{material.title}</TableCell>
                                <TableCell>{material.referenceCode || '-'}</TableCell>
                                <TableCell>{material.unitOfMeasure}</TableCell>
                                <TableCell className="text-right">
                                  <Button type="button" size="sm" onClick={() => handleSelectMaterialFromTable(material._id!)}>
                                    Seleccionar
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {searchTerm ? "No se encontraron materiales con ese criterio." : (projectMaterials.length === 0 ? "No hay materiales definidos para el proyecto." : "Comience a escribir para buscar.")}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 p-3 border rounded-md bg-muted/50">
                    <p className="text-sm font-medium">Material Seleccionado:</p>
                    <p className="text-sm">
                      <span className="font-semibold">{getSelectedMaterialDetails()?.title}</span> ({getSelectedMaterialDetails()?.referenceCode || '-'})
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={() => {setSelectedMaterialProject(''); setSearchTerm('');}}>
                      Cambiar Material
                    </Button>
                  </div>
                )}

                {selectedMaterialProject && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                        <div className="space-y-1">
                        <Label htmlFor="quantity-used">Cantidad a Usar</Label>
                        <Input
                            id="quantity-used"
                            type="text" 
                            value={String(quantityUsed)} 
                            onChange={(e) => setQuantityUsed(e.target.value)} 
                            onBlur={(e) => {
                                const numValue = parseFormattedNumber(e.target.value);
                                setQuantityUsed(numValue !== null ? formatNumberForInput(numValue) : '');
                            }}
                            placeholder="Ej. 10.5"
                            disabled={!selectedMaterialProject}
                        />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                        <Label htmlFor="profit-margin-new">Margen de Utilidad para esta tarea (%) (Opcional)</Label>
                        <Input
                            id="profit-margin-new"
                            type="text" 
                            value={String(profitMargin)}
                            onChange={(e) => setProfitMargin(e.target.value)}
                            onBlur={(e) => {
                                const numValue = parseFormattedNumber(e.target.value);
                                setProfitMargin(numValue !== null ? formatNumberForInput(numValue) : '');
                            }}
                            placeholder="Ej. 10 (si se deja vacío usará el del material)"
                            disabled={!selectedMaterialProject}
                        />
                        </div>
                        <div className="space-y-1">
                        <Label htmlFor="purchased-value-new">Valor de Compra para esta Asignación (Opcional)</Label>
                        <Input
                            id="purchased-value-new"
                            type="text" 
                            value={purchasedValueForTaskInput}
                            onChange={(e) => setPurchasedValueForTaskInput(e.target.value)}
                            onBlur={(e) => {
                                const numValue = parseFormattedNumber(e.target.value);
                                setPurchasedValueForTaskInput(numValue !== null ? formatNumberForInput(numValue) : '');
                            }}
                            placeholder="Ej. 50.000"
                            disabled={!selectedMaterialProject}
                        />
                        </div>
                    </div>
                    <Button type="submit" disabled={isSubmitting || !selectedMaterialProject || isLoadingProjectMaterials}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PackagePlus className="h-4 w-4 mr-2" />}
                        Asignar Material
                    </Button>
                  </>
                )}
              </form>
            ) : (
              <div className="space-y-4 p-1 border rounded-md">
                  <h3 className="text-lg font-medium">Editar Material Asignado: {((editingMaterialTask.materialProjectId as MaterialProjectType)?.title) || 'N/A'}</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                          <Label htmlFor="edit-quantity-used">Cantidad Usada</Label>
                          <Input
                              id="edit-quantity-used"
                              name="quantityUsed"
                              type="text" 
                              value={formatNumberForInput(editFormData.quantityUsed)}
                              onChange={(e) => handleEditInputChange('quantityUsed', e.target.value)}
                          />
                      </div>
                      <div>
                          <Label htmlFor="edit-profit-margin">Margen de Utilidad (%)</Label>
                          <Input
                              id="edit-profit-margin"
                              name="profitMarginForTaskMaterial"
                              type="text" 
                              placeholder="Ej: 10 (para 10%)"
                              value={formatNumberForInput(editFormData.profitMarginForTaskMaterial)}
                              onChange={(e) => handleEditInputChange('profitMarginForTaskMaterial', e.target.value)}
                          />
                      </div>
                      <div>
                          <Label htmlFor="edit-purchased-value">Valor Compra Tarea</Label>
                          <Input
                              id="edit-purchased-value"
                              name="purchasedValueForTask"
                              type="text" 
                              placeholder="Ej: 45.000"
                              value={formatNumberForInput(editFormData.purchasedValueForTask)}
                              onChange={(e) => handleEditInputChange('purchasedValueForTask', e.target.value)}
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
                <div className="border rounded-md max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título Material</TableHead>
                        <TableHead>Cód. Ref.</TableHead>
                        <TableHead className="text-right">Cant. Usada</TableHead>
                        <TableHead className="text-right">Costo Material Tarea</TableHead>
                        <TableHead className="text-right">Utilidad Tarea (%)</TableHead>
                        <TableHead className="text-right">Valor Compra Tarea</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedMaterials.map((mt) => (
                        <TableRow key={mt._id}>
                          <TableCell>{(mt.materialProjectId as MaterialProjectType)?.title || 'N/A'}</TableCell>
                          <TableCell>{(mt.materialProjectId as MaterialProjectType)?.referenceCode || '-'}</TableCell>
                          <TableCell className="text-right">{(mt.quantityUsed || 0).toLocaleString('es-CO')}</TableCell>
                          <TableCell className="text-right">{mt.materialCostForTask?.toLocaleString('es-CO', {minimumFractionDigits:0, maximumFractionDigits: 0}) ?? 'N/A'}</TableCell>
                          <TableCell className="text-right">{mt.profitMarginForTaskMaterial?.toLocaleString('es-CO') ?? '-'}</TableCell>
                          <TableCell className="text-right">{mt.purchasedValueForTask?.toLocaleString('es-CO', {minimumFractionDigits:0, maximumFractionDigits: 0}) ?? 'N/A'}</TableCell>
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
                                          <span className="font-semibold"> {(mt.materialProjectId as MaterialProjectType)?.title} ({(mt.materialProjectId as MaterialProjectType)?.referenceCode || '-'})</span> de esta tarea.
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
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No hay materiales asignados a esta tarea.</p>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t mt-auto">
          <Button variant="outline" onClick={() => { onClose(); setEditingMaterialTask(null); setSelectedMaterialProject(''); setSearchTerm(''); setIsCreateMaterialFormOpen(false); }} disabled={isSubmitting}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

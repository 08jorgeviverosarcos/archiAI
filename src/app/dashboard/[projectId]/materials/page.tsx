'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, PlusCircle, Trash2, Edit, Package, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { MaterialProject as MaterialProjectType } from '@/types';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { MaterialProjectForm } from '@/components/MaterialProjectForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Toaster } from '@/components/ui/toaster';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProjectMaterialsPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;
    const { toast } = useToast();

    const [materials, setMaterials] = useState<MaterialProjectType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<MaterialProjectType | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchMaterials = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/projects/${projectId}/materials`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch materials');
            }
            const data = await response.json();
            setMaterials(data.materials || []);
        } catch (err: any) {
            setError(err.message);
            toast({
                variant: "destructive",
                title: "Error",
                description: `No se pudieron cargar los materiales: ${err.message}`,
            });
        } finally {
            setIsLoading(false);
        }
    }, [projectId, toast]);

    useEffect(() => {
        fetchMaterials();
    }, [fetchMaterials]);

    const filteredMaterials = useMemo(() => {
        if (!searchTerm) {
            return materials;
        }
        const lowercasedFilter = searchTerm.toLowerCase();
        return materials.filter(material =>
            material.title.toLowerCase().includes(lowercasedFilter) ||
            material.referenceCode.toLowerCase().includes(lowercasedFilter) ||
            material.description.toLowerCase().includes(lowercasedFilter) ||
            material.brand.toLowerCase().includes(lowercasedFilter) ||
            material.supplier.toLowerCase().includes(lowercasedFilter)
        );
    }, [materials, searchTerm]);

    const handleAddMaterial = () => {
        setEditingMaterial(null);
        setIsFormOpen(true);
    };

    const handleEditMaterial = (material: MaterialProjectType) => {
        setEditingMaterial(material);
        setIsFormOpen(true);
    };

    const handleFormClose = () => {
        setIsFormOpen(false);
        setEditingMaterial(null);
    };

    const handleMaterialSaved = (savedMaterial: MaterialProjectType) => {
        fetchMaterials(); 
        handleFormClose();
        toast({
          title: editingMaterial ? 'Material Actualizado' : 'Material Creado',
          description: `El material "${savedMaterial.referenceCode}" ha sido guardado exitosamente.`,
        });
    };

    const handleDeleteMaterial = async (materialId: string) => {
        if (!materialId) return;
        try {
            const response = await fetch(`/api/materials/project/${materialId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete material');
            }
            toast({
                title: 'Material Eliminado',
                description: 'El material ha sido eliminado exitosamente.',
            });
            fetchMaterials(); 
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Error al Eliminar",
                description: `No se pudo eliminar el material: ${err.message}`,
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <span className="ml-2">Cargando materiales...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-4 md:p-8 text-center">
                <p className="text-destructive mb-4">{error}</p>
                <Button variant="outline" onClick={() => router.push(`/dashboard/${projectId}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/${projectId}`)} className="mb-2">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
                    </Button>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" />Gestión de Materiales del Proyecto</h1>
                    <p className="text-muted-foreground">Administra los materiales generales asociados a este proyecto.</p>
                </div>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleAddMaterial} className="w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-4 w-4" /> Agregar Material
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[750px] max-h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>{editingMaterial ? 'Editar Material' : 'Agregar Nuevo Material'}</DialogTitle>
                        </DialogHeader>
                        <MaterialProjectForm
                            projectId={projectId}
                            existingMaterial={editingMaterial}
                            onMaterialSaved={handleMaterialSaved}
                            onCancel={handleFormClose}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Lista de Materiales</CardTitle>
                    <CardDescription>Materiales disponibles para asignar a tareas del proyecto.</CardDescription>
                    <div className="pt-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Buscar por título, cód. ref., descripción, marca, proveedor..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredMaterials.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Título</TableHead>
                                    <TableHead>Cód. Ref.</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead>Marca</TableHead>
                                    <TableHead>Proveedor</TableHead>
                                    <TableHead>Unidad</TableHead>
                                    <TableHead className="text-right">Precio Unit. Est.</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMaterials.map((material) => (
                                    <TableRow key={material._id}>
                                        <TableCell className="font-medium">{material.title}</TableCell>
                                        <TableCell>{material.referenceCode}</TableCell>
                                        <TableCell>{material.description}</TableCell>
                                        <TableCell>{material.brand}</TableCell>
                                        <TableCell>{material.supplier}</TableCell>
                                        <TableCell>{material.unitOfMeasure}</TableCell>
                                        <TableCell className="text-right">{(material.estimatedUnitPrice ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditMaterial(material)}>
                                                <Edit className="h-4 w-4" />
                                                <span className="sr-only">Editar</span>
                                            </Button>
                                            {material._id && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                            <span className="sr-only">Eliminar</span>
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción no se puede deshacer. Esto eliminará permanentemente el material
                                                            <span className="font-semibold"> {material.title} ({material.referenceCode})</span>.
                                                        </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteMaterial(material._id!)}>
                                                            Eliminar
                                                        </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground mb-4">
                                {searchTerm ? "No se encontraron materiales con ese criterio de búsqueda." : "No hay materiales definidos para este proyecto."}
                            </p>
                            <Button onClick={handleAddMaterial}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Agregar Material
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Toaster />
        </div>
    );
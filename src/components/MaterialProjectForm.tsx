
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { MaterialProject } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';

const materialProjectFormSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  referenceCode: z.string().min(1, "El código de referencia es requerido"),
  brand: z.string().min(1, "La marca es requerida"),
  supplier: z.string().min(1, "El proveedor es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  unitOfMeasure: z.string().min(1, "La unidad de medida es requerida"),
  estimatedUnitPrice: z.number().min(0, "El precio unitario estimado debe ser no negativo").default(0),
  profitMargin: z.number().min(0).optional().nullable(),
});

type MaterialProjectFormData = z.infer<typeof materialProjectFormSchema>;

interface MaterialProjectFormProps {
  projectId: string;
  existingMaterial?: MaterialProject | null;
  onMaterialSaved: (material: MaterialProject) => void;
  onCancel: () => void;
}

export const MaterialProjectForm: React.FC<MaterialProjectFormProps> = ({
  projectId,
  existingMaterial,
  onMaterialSaved,
  onCancel,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MaterialProjectFormData>({
    resolver: zodResolver(materialProjectFormSchema),
    defaultValues: {
      title: existingMaterial?.title ?? '',
      referenceCode: existingMaterial?.referenceCode ?? '',
      brand: existingMaterial?.brand ?? '',
      supplier: existingMaterial?.supplier ?? '',
      description: existingMaterial?.description ?? '',
      unitOfMeasure: existingMaterial?.unitOfMeasure ?? '',
      estimatedUnitPrice: existingMaterial?.estimatedUnitPrice ?? 0,
      profitMargin: existingMaterial?.profitMargin ?? null,
    },
  });

   useEffect(() => {
       form.reset({
        title: existingMaterial?.title ?? '',
        referenceCode: existingMaterial?.referenceCode ?? '',
        brand: existingMaterial?.brand ?? '',
        supplier: existingMaterial?.supplier ?? '',
        description: existingMaterial?.description ?? '',
        unitOfMeasure: existingMaterial?.unitOfMeasure ?? '',
        estimatedUnitPrice: existingMaterial?.estimatedUnitPrice ?? 0,
        profitMargin: existingMaterial?.profitMargin ?? null,
       });
   }, [existingMaterial, form]);

  const onSubmit = async (data: MaterialProjectFormData) => {
    setIsSubmitting(true);
    try {
      const url = existingMaterial?._id 
        ? `/api/materials/project/${existingMaterial._id}` 
        : `/api/projects/${projectId}/materials`;
      const method = existingMaterial?._id ? 'PUT' : 'POST';

      const payload = {
        ...data,
        profitMargin: data.profitMargin === undefined ? null : data.profitMargin, // Ensure null is sent if undefined
      };

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Fallo al ${existingMaterial ? 'actualizar' : 'crear'} el material`);
      }

      const savedMaterialResponse = await response.json();
      onMaterialSaved(savedMaterialResponse.materialProject || savedMaterialResponse);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: `Error al ${existingMaterial ? 'actualizar' : 'crear'} el material`,
        description: error.message || 'Ocurrió un error inesperado.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <ScrollArea className="flex-grow overflow-y-auto pr-6 max-h-[70vh]">
        <form id="material-project-form-id" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título del Material</FormLabel>
                <FormControl>
                  <Input placeholder="Ej. Ladrillo Estructural" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="referenceCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código de Referencia</FormLabel>
                <FormControl>
                  <Input placeholder="Ej. CER-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea placeholder="Ej. Cerámica para piso alto tráfico" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Marca</FormLabel>
                        <FormControl>
                        <Input placeholder="Ej. Corona" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Proveedor</FormLabel>
                        <FormControl>
                        <Input placeholder="Ej. Homecenter" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                    control={form.control}
                    name="unitOfMeasure"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Unidad Medida</FormLabel>
                        <FormControl>
                        <Input placeholder="Ej. m², und, kg" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="estimatedUnitPrice"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Precio Unit. Est.</FormLabel>
                        <FormControl>
                        <Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))} value={field.value === 0 ? '' : field.value} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="profitMargin"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>% Utilidad (Opcional)</FormLabel>
                        <FormControl>
                        <Input type="number" step="0.1" placeholder="Ej. 10" {...field} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
        </form>
      </ScrollArea>

       <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
            </Button>
            <Button type="submit" form="material-project-form-id" disabled={isSubmitting}>
                {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                    </>
                ) : (
                    existingMaterial ? 'Actualizar Material' : 'Crear Material'
                )}
            </Button>
        </div>
    </Form>
  );
};

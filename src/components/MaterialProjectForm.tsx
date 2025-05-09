
'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { MaterialProject as MaterialProjectType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Asterisk } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const unitsOfMeasureValues = [
  'm', 'm²', 'm³', 'kg', 'L', 'gal', 'unidad', 'caja', 'rollo', 'bolsa', 'hr', 'día', 'semana', 'mes', 'global', 'pulg', 'pie', 'yd', 'ton', 'lb'
] as const;

const materialProjectFormSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  referenceCode: z.string().min(1, "El código de referencia es requerido"),
  brand: z.string().min(1, "La marca es requerida"),
  supplier: z.string().min(1, "El proveedor es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  unitOfMeasure: z.enum(unitsOfMeasureValues, {
    required_error: "La unidad de medida es requerida.",
  }),
  estimatedUnitPrice: z.preprocess(
    (val) => (String(val).trim() === '' ? 0 : Number(val)), // If empty, default to 0, otherwise convert to number
    z.number().min(0, "El precio unitario estimado debe ser no negativo")
  ),
  profitMargin: z.preprocess(
    (val) => (String(val).trim() === '' ? null : Number(val)), // If empty, treat as null, otherwise convert to number
    z.number().min(0, "El margen de utilidad debe ser no negativo").nullable()
  ),
});

type MaterialProjectFormData = z.infer<typeof materialProjectFormSchema>;

interface MaterialProjectFormProps {
  projectId: string;
  existingMaterial?: MaterialProjectType | null;
  onMaterialSaved: (material: MaterialProjectType) => void;
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
      unitOfMeasure: existingMaterial?.unitOfMeasure ?? undefined,
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
      unitOfMeasure: existingMaterial?.unitOfMeasure ?? undefined,
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

      // For PUT, only send fields that have values to avoid overwriting with undefined
      // For POST, send all data
      let payload: Partial<MaterialProjectFormData> | MaterialProjectFormData = data;
      if (method === 'PUT') {
        payload = {};
        for (const key in data) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            const typedKey = key as keyof MaterialProjectFormData;
            // For profitMargin, if it's null in form data, we send it as null.
            // For other fields, if they are empty strings or undefined (after zod preprocessing), they might not be sent
            // or sent as their default (e.g., estimatedUnitPrice as 0 if empty).
            // Zod schema ensures they are of correct type or default before this point.
            if (data[typedKey] !== undefined ) {
                 // @ts-ignore
                payload[typedKey] = data[typedKey];
            }
          }
        }
      }


      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Fallo al ${existingMaterial ? 'actualizar' : 'crear'} el material`);
      }

      const result = await response.json();
      const savedMaterial = result.materialProject;
      
      toast({
        title: existingMaterial ? 'Material Actualizado' : 'Material Creado',
        description: `El material "${savedMaterial.referenceCode}" ha sido guardado exitosamente.`,
      });
      onMaterialSaved(savedMaterial);
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
      <ScrollArea className="flex-grow overflow-y-auto pr-6 max-h-[calc(90vh-150px)]">
        <form id="material-project-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título <Asterisk className="inline h-3 w-3 text-destructive" /></FormLabel>
                <FormControl>
                  <Input placeholder="Ej. Ladrillo Común" {...field} />
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
                <FormLabel>Código de Referencia <Asterisk className="inline h-3 w-3 text-destructive" /></FormLabel>
                <FormControl>
                  <Input placeholder="Ej. LAD-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca <Asterisk className="inline h-3 w-3 text-destructive" /></FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Argos" {...field} />
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
                  <FormLabel>Proveedor <Asterisk className="inline h-3 w-3 text-destructive" /></FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Homecenter" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción <Asterisk className="inline h-3 w-3 text-destructive" /></FormLabel>
                <FormControl>
                  <Textarea placeholder="Detalles del material..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="unitOfMeasure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidad de Medida <Asterisk className="inline h-3 w-3 text-destructive" /></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar unidad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {unitsOfMeasureValues.map(unit => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estimatedUnitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Unit. Estimado <Asterisk className="inline h-3 w-3 text-destructive" /></FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="Ej. 15000" 
                      {...field} 
                      value={field.value ?? ''} // Ensure empty string if null/undefined
                      onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))} 
                    />
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
                  <FormLabel>Margen Utilidad (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1" 
                      placeholder="Ej. 10 (para 10%)" 
                      {...field} 
                      value={field.value ?? ''} // Ensure empty string if null/undefined
                      onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} 
                    />
                  </FormControl>
                  <FormDescription>Opcional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </ScrollArea>
      <div className="flex justify-end space-x-2 pt-4 border-t mt-auto">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" form="material-project-form" disabled={isSubmitting}>
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

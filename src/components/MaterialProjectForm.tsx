
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
import { formatNumberForInput, parseFormattedNumber } from '@/lib/formattingUtils';

const unitsOfMeasureValues = [
  'm', 'm²', 'm³', 'kg', 'L', 'gal', 'unidad', 'caja', 'rollo', 'bolsa', 'hr', 'día', 'semana', 'mes', 'global', 'pulg', 'pie', 'yd', 'ton', 'lb'
] as const;

const materialProjectFormSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  referenceCode: z.string().optional().nullable(), // Optional
  brand: z.string().optional().nullable(), // Optional
  supplier: z.string().optional().nullable(), // Optional
  description: z.string().optional().nullable(), // Optional
  unitOfMeasure: z.enum(unitsOfMeasureValues, {
    required_error: "La unidad de medida es requerida.",
  }),
  estimatedUnitPrice: z.preprocess(
    (val) => (String(val).trim() === '' ? 0 : Number(val)), 
    z.number().min(0, "El precio unitario estimado debe ser no negativo")
  ),
  profitMargin: z.preprocess(
    (val) => (String(val).trim() === '' ? null : Number(val)), 
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

      // For PUT, only send fields that have changed or are part of the schema
      // For POST, send all data
      let payload: Partial<MaterialProjectFormData> | MaterialProjectFormData = data;
      if (method === 'PUT') {
        payload = {}; // Initialize an empty object for PUT payload
        // Iterate over form data keys
        for (const key of Object.keys(data) as Array<keyof MaterialProjectFormData>) {
            // If the field is in existingMaterial, compare values
            if (existingMaterial && Object.prototype.hasOwnProperty.call(existingMaterial, key)) {
                // @ts-ignore - existingMaterial might not have all keys of MaterialProjectFormData if types diverge slightly
                if (data[key] !== existingMaterial[key]) {
                    payload[key] = data[key];
                }
            } else {
                // If the field is not in existingMaterial (e.g. new optional field being set), include it
                 payload[key] = data[key];
            }
        }
        // Ensure all fields from the schema are considered, even if undefined initially
        // This is important if you want to explicitly set a field to null/undefined
        (Object.keys(materialProjectFormSchema.shape) as Array<keyof MaterialProjectFormData>).forEach(schemaKey => {
            if (data[schemaKey] !== undefined && !Object.prototype.hasOwnProperty.call(payload, schemaKey)) {
                 payload[schemaKey] = data[schemaKey];
            }
        });

        if (Object.keys(payload).length === 0) {
            toast({
                title: 'Sin cambios',
                description: 'No se detectaron cambios para actualizar.',
            });
            setIsSubmitting(false);
            onCancel(); // Or onMaterialSaved if preferred for consistency
            return;
        }

      } else { // POST
         payload = data;
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
        description: `El material "${savedMaterial.referenceCode || savedMaterial.title}" ha sido guardado exitosamente.`,
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
                <FormLabel>Código de Referencia</FormLabel>
                <FormControl>
                  <Input placeholder="Ej. LAD-001 (Opcional)" {...field} value={field.value ?? ''}/>
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
                  <FormLabel>Marca</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Argos (Opcional)" {...field} value={field.value ?? ''}/>
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
                    <Input placeholder="Ej. Homecenter (Opcional)" {...field} value={field.value ?? ''}/>
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
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea placeholder="Detalles del material... (Opcional)" {...field} value={field.value ?? ''}/>
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
                      type="text" 
                      placeholder="Ej. 15.000" 
                      {...field} 
                      value={field.value === 0 && !existingMaterial?.estimatedUnitPrice ? '' : formatNumberForInput(field.value)} // Show empty if 0 and new
                      onChange={e => field.onChange(parseFormattedNumber(e.target.value) ?? 0)} 
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
                      placeholder="Ej. 10 (Opcional)" 
                      {...field} 
                      value={field.value ?? ''} 
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

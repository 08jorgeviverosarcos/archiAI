
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Task } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

// Zod schema for task validation
const taskFormSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
  quantity: z.number().min(0, "La cantidad debe ser positiva").default(1),
  unitOfMeasure: z.string().min(1, "La unidad de medida es requerida"),
  unitPrice: z.number().min(0, "El precio unitario debe ser positivo").default(0),
  status: z.enum(['Pendiente', 'En Progreso', 'Realizado']).default('Pendiente'),
  profitMargin: z.number().optional().nullable(),
  laborCost: z.number().min(0).optional().nullable(),
  // projectId and phaseUUID will be passed as props, not part of the form fields
  // estimatedCost is calculated
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  projectId: string;
  phaseUUID: string;
  existingTask?: Task | null; // Task object if editing, null/undefined if creating
  onTaskSaved: (task: Task) => void; // Callback when task is successfully saved
  onCancel: () => void; // Callback for closing the form
}

export const TaskForm: React.FC<TaskFormProps> = ({
  projectId,
  phaseUUID,
  existingTask,
  onTaskSaved,
  onCancel,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: existingTask?.title ?? '',
      description: existingTask?.description ?? '',
      quantity: existingTask?.quantity ?? 1,
      unitOfMeasure: existingTask?.unitOfMeasure ?? '',
      unitPrice: existingTask?.unitPrice ?? 0,
      status: existingTask?.status ?? 'Pendiente',
      profitMargin: existingTask?.profitMargin ?? null,
      laborCost: existingTask?.laborCost ?? null,
    },
  });

   // Reset form if existingTask changes (e.g., switching between edit/add)
   useEffect(() => {
       form.reset({
           title: existingTask?.title ?? '',
           description: existingTask?.description ?? '',
           quantity: existingTask?.quantity ?? 1,
           unitOfMeasure: existingTask?.unitOfMeasure ?? '',
           unitPrice: existingTask?.unitPrice ?? 0,
           status: existingTask?.status ?? 'Pendiente',
           profitMargin: existingTask?.profitMargin ?? null,
           laborCost: existingTask?.laborCost ?? null,
       });
   }, [existingTask, form]);

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    try {
      const url = existingTask?._id ? `/api/tasks/${existingTask._id}` : '/api/tasks';
      const method = existingTask?._id ? 'PUT' : 'POST';

      const payload = {
        ...data,
        projectId: projectId, // Add projectId
        phaseUUID: phaseUUID, // Add phaseUUID
      };

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${existingTask ? 'update' : 'create'} task`);
      }

      const savedTask = await response.json();
      onTaskSaved(savedTask.task); // Pass the saved task data back

    } catch (error: any) {
      console.error(`Error saving task:`, error);
      toast({
        variant: 'destructive',
        title: `Error al ${existingTask ? 'actualizar' : 'crear'} la tarea`,
        description: error.message || 'Ocurrió un error inesperado.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título de la Tarea</FormLabel>
              <FormControl>
                <Input placeholder="Ej. Instalación de piso" {...field} />
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
              <FormLabel>Descripción (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalles adicionales sobre la tarea..." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                name="unitPrice"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Precio Unitario</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
             />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
                control={form.control}
                name="laborCost"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Costo Mano Obra (Opc)</FormLabel>
                    <FormControl>
                         <Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} value={field.value ?? ''}/>
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
                    <FormLabel>% Utilidad (Opc)</FormLabel>
                    <FormControl>
                         <Input type="number" step="0.1" placeholder="Ej. 10" {...field} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} value={field.value ?? ''}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                        <SelectItem value="En Progreso">En Progreso</SelectItem>
                        <SelectItem value="Realizado">Realizado</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>


        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                </>
            ) : (
                existingTask ? 'Actualizar Tarea' : 'Crear Tarea'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

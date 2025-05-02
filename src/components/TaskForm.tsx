
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
import { Loader2, CalendarIcon } from 'lucide-react';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Import Spanish locale for date formatting
import { Slider } from '@/components/ui/slider'; // Import Slider

// Zod schema for task validation - updated with new fields
const taskFormSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
  quantity: z.number().min(0, "La cantidad debe ser positiva").default(1),
  unitOfMeasure: z.string().min(1, "La unidad de medida es requerida"),
  unitPrice: z.number().min(0, "El precio unitario debe ser positivo").default(0),
  estimatedDuration: z.number().min(0, "La duración debe ser positiva").optional().nullable(), // Optional, allow null
  status: z.enum(['Pendiente', 'En Progreso', 'Realizado']).default('Pendiente'),
  profitMargin: z.number().optional().nullable(), // Optional and nullable
  laborCost: z.number().min(0).optional().nullable(), // Optional and nullable
  executionPercentage: z.number().min(0).max(100).optional().nullable(), // Optional (0-100)
  startDate: z.date().optional().nullable(), // Optional date
  endDate: z.date().optional().nullable(), // Optional date
  // projectId and phaseUUID will be passed as props, not part of the form fields
  // estimatedCost is calculated
}).refine(data => {
    // Optional: Add validation if end date must be after start date
    if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
    }
    return true;
}, {
    message: "La fecha de finalización debe ser posterior o igual a la fecha de inicio.",
    path: ["endDate"], // Point the error to the endDate field
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
      estimatedDuration: existingTask?.estimatedDuration ?? null, // Default to null
      status: existingTask?.status ?? 'Pendiente',
      profitMargin: existingTask?.profitMargin ?? null, // Default to null
      laborCost: existingTask?.laborCost ?? null, // Default to null
      executionPercentage: existingTask?.executionPercentage ?? null, // Default to null
      // Initialize dates correctly, ensuring they are Date objects if present
      startDate: existingTask?.startDate ? new Date(existingTask.startDate) : null,
      endDate: existingTask?.endDate ? new Date(existingTask.endDate) : null,
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
            estimatedDuration: existingTask?.estimatedDuration ?? null, // Reset to null
            status: existingTask?.status ?? 'Pendiente',
            profitMargin: existingTask?.profitMargin ?? null, // Reset to null
            laborCost: existingTask?.laborCost ?? null, // Reset to null
            executionPercentage: existingTask?.executionPercentage ?? null, // Reset to null
            startDate: existingTask?.startDate ? new Date(existingTask.startDate) : null,
            endDate: existingTask?.endDate ? new Date(existingTask.endDate) : null,
       });
   }, [existingTask, form]);

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    try {
      const url = existingTask?._id ? `/api/tasks/${existingTask._id}` : '/api/tasks';
      const method = existingTask?._id ? 'PUT' : 'POST';

      // Prepare payload, ensuring dates are handled correctly (pass as ISO strings or Date objects depending on API)
      const payload = {
        ...data,
        profitMargin: data.profitMargin === undefined ? null : data.profitMargin,
        laborCost: data.laborCost === undefined ? null : data.laborCost,
        estimatedDuration: data.estimatedDuration === undefined ? null : data.estimatedDuration,
        executionPercentage: data.executionPercentage === undefined ? null : data.executionPercentage,
        startDate: data.startDate || null, // Pass null if undefined/null
        endDate: data.endDate || null, // Pass null if undefined/null
        projectId: projectId, // Add projectId
        phaseUUID: phaseUUID, // Add phaseUUID
      };

      console.log("Sending task payload:", payload);

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = `Fallo al ${existingTask ? 'actualizar' : 'crear'} la tarea`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
          console.error('API Error Response:', errorData);
        } catch(e) {
            const errorText = await response.text();
            console.error('API Error Response (Text):', errorText);
            errorMsg = `${errorMsg}: ${errorText.substring(0, 100)}...`;
        }
        throw new Error(errorMsg);
      }

      const savedTask = await response.json();
      console.log("Task saved successfully:", savedTask);
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
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
                        <Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
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
                         {/* Handle empty string to pass null */}
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
                         {/* Handle empty string to pass null */}
                         <Input type="number" step="0.1" placeholder="Ej. 10" {...field} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} value={field.value ?? ''}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="estimatedDuration"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Duración Estimada (días)</FormLabel>
                    <FormControl>
                         <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} value={field.value ?? ''}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Inicio</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es }) // Use Spanish locale
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined} // Pass undefined if null
                          onSelect={(date) => field.onChange(date)}
                          disabled={(date) =>
                            // Optional: Disable past dates if needed
                            // date < new Date() || date < new Date("1900-01-01")
                            false
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Fin</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es }) // Use Spanish locale
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined} // Pass undefined if null
                          onSelect={field.onChange}
                          disabled={(date) =>
                            // Disable dates before the start date if a start date is selected
                            (form.getValues("startDate") && date < form.getValues("startDate")!) || false
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
        </div>

        {/* Execution Percentage Slider */}
        <FormField
            control={form.control}
            name="executionPercentage"
            render={({ field: { value, onChange } }) => ( // Destructure value and onChange
              <FormItem>
                <FormLabel>Porcentaje de Ejecución ({value ?? 0}%)</FormLabel>
                 <FormControl>
                  <Slider
                    // Use value directly from field, default to 0 if null/undefined
                    value={[value ?? 0]}
                    // Update form field value on change
                    onValueChange={(vals) => onChange(vals[0])}
                    max={100}
                    step={1}
                    className="py-2" // Add some padding
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
         />


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

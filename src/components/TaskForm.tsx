'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Task } from '@/types'; // Use type alias
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
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea
import { formatNumberForInput, parseFormattedNumber } from '@/lib/formattingUtils';

const unitsOfMeasure = [
  'm', 'm²', 'm³', 'kg', 'L', 'gal', 'unidad', 'caja', 'rollo', 'bolsa', 'hr', 'día', 'semana', 'mes', 'global', 'pulg', 'pie', 'yd', 'ton', 'lb'
] as const;

// Zod schema for task validation - updated with new fields
const taskFormSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
  quantity: z.number().min(0, "La cantidad debe ser positiva").default(1),
  unitOfMeasure: z.enum(unitsOfMeasure, {
    required_error: "La unidad de medida es requerida.",
  }),
  unitPrice: z.number().min(0, "El precio unitario debe ser positivo").default(0),
  estimatedDuration: z.number().min(0, "La duración debe ser positiva").optional().nullable(), // Optional, allow null
  status: z.enum(['Pendiente', 'En Progreso', 'Realizado']).default('Pendiente'),
  profitMargin: z.number().optional().nullable(), // Optional and nullable
  laborCost: z.number().min(0).optional().nullable(), // Optional and nullable
  executionPercentage: z.number().min(0).max(100).optional().nullable(), // Optional (0-100), allow null
  startDate: z.date().optional().nullable(), // Optional date, allow null
  endDate: z.date().optional().nullable(), // Optional date, allow null
}).refine(data => {
    if (data.startDate && data.endDate) {
        if (data.startDate instanceof Date && !isNaN(data.startDate.getTime()) &&
            data.endDate instanceof Date && !isNaN(data.endDate.getTime())) {
            return data.endDate >= data.startDate;
        }
        return true;
    }
    return true;
}, {
    message: "La fecha de finalización debe ser posterior o igual a la fecha de inicio.",
    path: ["endDate"],
});


type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  projectId: string;
  phaseUUID: string;
  existingTask?: Task | null;
  onTaskSaved: (task: Task) => void;
  onCancel: () => void;
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
      unitOfMeasure: existingTask?.unitOfMeasure ? unitsOfMeasure.find(u => u === existingTask.unitOfMeasure) : undefined,
      unitPrice: existingTask?.unitPrice ?? 0,
      estimatedDuration: existingTask?.estimatedDuration ?? null,
      status: existingTask?.status ?? 'Pendiente',
      profitMargin: existingTask?.profitMargin ?? null,
      laborCost: existingTask?.laborCost ?? null,
      executionPercentage: existingTask?.executionPercentage ?? null,
       startDate: existingTask?.startDate ? (new Date(existingTask.startDate) instanceof Date && !isNaN(new Date(existingTask.startDate).getTime()) ? new Date(existingTask.startDate) : null) : null,
       endDate: existingTask?.endDate ? (new Date(existingTask.endDate) instanceof Date && !isNaN(new Date(existingTask.endDate).getTime()) ? new Date(existingTask.endDate) : null) : null,
    },
  });

   useEffect(() => {
       form.reset({
            title: existingTask?.title ?? '',
            description: existingTask?.description ?? '',
            quantity: existingTask?.quantity ?? 1,
            unitOfMeasure: existingTask?.unitOfMeasure ? unitsOfMeasure.find(u => u === existingTask.unitOfMeasure) : undefined,
            unitPrice: existingTask?.unitPrice ?? 0,
            estimatedDuration: existingTask?.estimatedDuration ?? null,
            status: existingTask?.status ?? 'Pendiente',
            profitMargin: existingTask?.profitMargin ?? null,
            laborCost: existingTask?.laborCost ?? null,
            executionPercentage: existingTask?.executionPercentage ?? null,
             startDate: existingTask?.startDate ? (new Date(existingTask.startDate) instanceof Date && !isNaN(new Date(existingTask.startDate).getTime()) ? new Date(existingTask.startDate) : null) : null,
             endDate: existingTask?.endDate ? (new Date(existingTask.endDate) instanceof Date && !isNaN(new Date(existingTask.endDate).getTime()) ? new Date(existingTask.endDate) : null) : null,
       });
   }, [existingTask, form]);

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    console.log("Submitting task form data:", data);
    try {
      const url = existingTask?._id ? `/api/tasks/${existingTask._id}` : '/api/tasks';
      const method = existingTask?._id ? 'PUT' : 'POST';

      const basePayload: any = {
        ...data,
        profitMargin: data.profitMargin === undefined || data.profitMargin === null ? null : data.profitMargin,
        laborCost: data.laborCost === undefined || data.laborCost === null ? null : data.laborCost,
        estimatedDuration: data.estimatedDuration === undefined || data.estimatedDuration === null ? null : data.estimatedDuration,
        executionPercentage: data.executionPercentage === undefined || data.executionPercentage === null ? null : data.executionPercentage,
        startDate: data.startDate ? data.startDate.toISOString() : null,
        endDate: data.endDate ? data.endDate.toISOString() : null,
      };

      const payload = method === 'POST'
        ? { ...basePayload, projectId: projectId, phaseUUID: phaseUUID }
        : basePayload;


      console.log("Sending task payload:", payload, "to URL:", url, "with method:", method);

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = `Fallo al ${existingTask ? 'actualizar' : 'crear'} la tarea`;
        const errorText = await response.text(); // Get raw error text
        console.error('API Error Response (Raw Text):', errorText);
        try {
          const errorData = JSON.parse(errorText); // Try to parse as JSON
          errorMsg = errorData.message || errorMsg;
          if (errorData.errors) {
            console.error('Zod Validation Errors:', errorData.errors);
            errorMsg += ` Detalles: ${JSON.stringify(errorData.errors)}`;
          }
        } catch(e) {
          console.error('Failed to parse API error response as JSON:', e);
          errorMsg += `: ${errorText.substring(0, 200)}...`;
        }
         throw new Error(errorMsg);
      }

      const savedTaskResponse = await response.json();
      console.log("Task saved successfully:", savedTaskResponse);
       if (savedTaskResponse && savedTaskResponse.task) {
            onTaskSaved(savedTaskResponse.task);
       } else {
            console.warn("Task data not found in expected structure in response:", savedTaskResponse);
            onTaskSaved(savedTaskResponse); 
       }


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
      <ScrollArea className="flex-grow overflow-y-auto pr-6 max-h-[calc(90vh-200px)]"> 
        <form id="task-form-id" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                       <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))} value={field.value === 0 ? '' : field.value}/>
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
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Seleccionar unidad" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {unitsOfMeasure.map(unit => (
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
                  name="unitPrice"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Precio Unitario</FormLabel>
                      <FormControl>
                          <Input 
                            type="text" // Changed to text
                            {...field} 
                            value={field.value === 0 ? '' : formatNumberForInput(field.value)}
                            onChange={e => field.onChange(parseFormattedNumber(e.target.value) ?? 0)} 
                          />
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
                           <Input 
                            type="text" // Changed to text
                            {...field} 
                            value={field.value === null || field.value === undefined ? '' : formatNumberForInput(field.value)}
                            onChange={e => field.onChange(parseFormattedNumber(e.target.value))}
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
                  name="estimatedDuration"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Duración Estimada (días)</FormLabel>
                      <FormControl>
                           <Input type="number" placeholder="Ej. 5" {...field} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} value={field.value ?? ''}/>
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
                    <FormItem className="flex flex-col pt-2">
                      <FormLabel>Fecha de Inicio (Opc)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
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
                             selected={field.value ?? undefined}
                            onSelect={(date) => field.onChange(date || null)}
                            disabled={(date) =>
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
                    <FormItem className="flex flex-col pt-2">
                      <FormLabel>Fecha de Fin (Opc)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
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
                            selected={field.value ?? undefined}
                             onSelect={(date) => field.onChange(date || null)}
                            disabled={(date) => {
                                const startDateValue = form.getValues("startDate");
                                const validStartDate = startDateValue instanceof Date && !isNaN(startDateValue.getTime());
                                return (validStartDate && date < startDateValue!) || false; 
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
          </div>

          <FormField
              control={form.control}
              name="executionPercentage"
              render={({ field: { value, onChange } }) => (
                <FormItem>
                  <FormLabel>Porcentaje de Ejecución ({value ?? 0}%)</FormLabel>
                   <FormControl>
                    <Slider
                      value={[value ?? 0]} 
                       onValueChange={(vals) => onChange(vals[0])} 
                      max={100}
                      step={1}
                      className="py-2" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
           />
        </form>
      </ScrollArea>

       <div className="flex justify-end space-x-2 pt-4 border-t mt-auto"> 
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
            </Button>
            <Button type="submit" form="task-form-id" disabled={isSubmitting}>
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
    </Form>
  );
};

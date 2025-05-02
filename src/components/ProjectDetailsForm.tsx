'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Asterisk } from 'lucide-react';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ProjectDetails, InitialPlan as InitialPlanType } from '@/types'; // Ensure InitialPlanType is imported
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface ProjectDetailsFormProps {
  // Callback function when project and initial plan are successfully created
  onProjectCreated: (projectDetails: ProjectDetails, initialPlan: InitialPlanType[] | null, initialPlanId: string | null) => void;
  // Function to handle cancellation or going back
  onCancel: () => void;
}


// Schema should match the data being sent to the API POST request
const formSchema = z.object({
  projectName: z.string().min(2, {
    message: 'El nombre del proyecto debe tener al menos 2 caracteres.',
  }),
  projectDescription: z.string().optional(),
  projectType: z.enum(['Casa nueva', 'Remodelación parcial', 'Remodelación total', 'Edificio residencial', 'Edificio comercial', 'Otro'], {
    required_error: 'Por favor, seleccione un tipo de proyecto.',
  }),
  projectLocation: z.string().optional(),
  totalBudget: z.number().min(1, {
    message: 'El presupuesto total debe ser mayor que 0.',
  }),
  currency: z.string().min(2).max(3, {
    message: 'La moneda debe tener entre 2 y 3 caracteres.',
  }).default('COP'), // Default currency
  functionalRequirements: z.string().min(10, {
    message: 'Los requisitos funcionales deben tener al menos 10 caracteres.',
  }),
  aestheticPreferences: z.string().optional(),
});

export const ProjectDetailsForm: React.FC<ProjectDetailsFormProps> = ({
    onProjectCreated,
    onCancel // Receive the cancel handler
}) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: '',
      projectDescription: '',
      projectType: undefined, // Let placeholder show initially
      projectLocation: '',
      totalBudget: 0,
      currency: 'COP', // Default currency
      functionalRequirements: '',
      aestheticPreferences: '',
    },
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);


  async function onSubmit(values: z.infer<typeof formSchema>) {
     console.log("Form submitted with values:", values);
     setIsSubmitting(true);
    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      console.log("API response status:", response.status);

      if (!response.ok) {
        let errorData = { message: `Server error: ${response.statusText}` };
        try {
          errorData = await response.json(); // Try parsing JSON first
          console.error('API Error Response (JSON):', errorData);
        } catch (jsonError) {
           const errorText = await response.text(); // Read text if JSON parsing fails
          console.error('API Error Response (Text):', errorText);
          errorData.message = `Failed to generate plan. Server responded with: ${errorText.substring(0, 100)}...`; // Include part of the text error
        }
        throw new Error(errorData.message || 'Fallo al generar el plan inicial');
      }

      const data = await response.json(); // Parse JSON only if response is ok
      console.log("API success response data:", data);

      // Prepare data for the callback
      const newProjectDetails: ProjectDetails = {
           ...values,
           _id: data.projectId,
           createdAt: new Date(), // Add creation timestamp locally
           updatedAt: new Date(), // Add update timestamp locally
       };
      const generatedPlan: InitialPlanType[] | null = data.initialPlan || null;
      const planId: string | null = data.initialPlanId || null;

      // Call the callback function passed from the parent
      onProjectCreated(newProjectDetails, generatedPlan, planId);


      toast({
        title: 'Plan Inicial Generado',
        description: 'El plan inicial se ha generado y guardado correctamente.',
      });


    } catch (error: any) {
      console.error('Error al generar el plan inicial:', error);
      toast({
        variant: 'destructive',
        title: 'Error al generar el plan',
        description: error.message || 'Ocurrió un error inesperado. Por favor, inténtelo de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <h2 className="text-xl font-bold mb-4">Crear Nuevo Proyecto</h2>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Información General */}
        <div>
            <h3 className="text-lg font-semibold mb-2 border-b pb-1">Información del Proyecto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nombre del Proyecto <Asterisk className="inline h-3 w-3 text-destructive" />
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Remodelación Apartamento Familia Pérez" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="projectType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tipo de Proyecto <Asterisk className="inline h-3 w-3 text-destructive" />
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Casa nueva">Casa nueva</SelectItem>
                          <SelectItem value="Remodelación parcial">Remodelación parcial</SelectItem>
                          <SelectItem value="Remodelación total">Remodelación total</SelectItem>
                          <SelectItem value="Edificio residencial">Edificio residencial</SelectItem>
                          <SelectItem value="Edificio comercial">Edificio comercial</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="projectDescription"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Descripción del Proyecto (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Ingrese detalles adicionales sobre el proyecto." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación del Proyecto (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ingrese la dirección o ubicación general." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
        </div>

         {/* Section 2: Presupuesto */}
         <div>
             <h3 className="text-lg font-semibold mb-2 border-b pb-1">Presupuesto Inicial</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="totalBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Presupuesto Total Estimado <Asterisk className="inline h-3 w-3 text-destructive" />
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ingrese el presupuesto"
                          {...field} // Spread field props first
                          value={field.value === 0 ? '' : field.value} // Control value for placeholder behavior
                          onChange={(e) => {
                            const value = e.target.value;
                             // Allow empty input or convert to number
                            field.onChange(value === '' ? 0 : Number(value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Moneda <Asterisk className="inline h-3 w-3 text-destructive" /></FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                             <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar moneda"/>
                            </SelectTrigger>
                            </FormControl>
                             <SelectContent>
                                 <SelectItem value="COP">COP</SelectItem>
                                 <SelectItem value="USD">USD</SelectItem>
                                 <SelectItem value="EUR">EUR</SelectItem>
                                 {/* Add other currencies as needed */}
                             </SelectContent>
                         </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            </div>
         </div>


        {/* Section 3: Requisitos */}
         <div>
            <h3 className="text-lg font-semibold mb-2 border-b pb-1">Requisitos y Preferencias</h3>
            <div className="space-y-4">
                 <FormField
                  control={form.control}
                  name="functionalRequirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Requisitos Funcionales Principales <Asterisk className="inline h-3 w-3 text-destructive" />
                      </FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder="Ej. 3 habitaciones, 2 baños, cocina abierta..." {...field} />
                      </FormControl>
                       <FormDescription>Describa brevemente los espacios y necesidades clave.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="aestheticPreferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferencias Estéticas (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Ej. Estilo moderno, acabados en madera, colores neutros..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
         </div>

        <div className="flex justify-between pt-4">
             <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancelar
             </Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Generando...' : 'Generar Planificación Inicial'}
            </Button>
        </div>
      </form>
    </Form>
  );
};

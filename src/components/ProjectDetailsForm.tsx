'use client';

import React from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {Asterisk} from 'lucide-react';

import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {ProjectDetails} from '@/types';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {useToast} from '@/hooks/use-toast';

interface ProjectDetailsFormProps {
  setProjectDetails: (details: ProjectDetails) => void;
  setInitialPlan: (plan: any) => void; // Update type as needed
  setProjectId: (id: string) => void;
}

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
  }),
  functionalRequirements: z.string().min(10, {
    message: 'Los requisitos funcionales deben tener al menos 10 caracteres.',
  }),
  aestheticPreferences: z.string().optional(),
});

export const ProjectDetailsForm: React.FC<ProjectDetailsFormProps> = ({setProjectDetails, setInitialPlan, setProjectId}) => {
  const {toast} = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: '',
      projectDescription: '',
      projectType: 'Casa nueva',
      projectLocation: '',
      totalBudget: 0,
      currency: 'USD',
      functionalRequirements: '',
      aestheticPreferences: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fallo al generar el plan inicial');
      }

      const data = await response.json();
      setInitialPlan(data.initialPlan);
      setProjectDetails(values);
      setProjectId(data.projectId); // Extract project ID
    } catch (error: any) {
      console.error('Error generating initial plan:', error);
      toast({
        variant: 'destructive',
        title: 'Error al generar el plan',
        description: error.message || 'Fallo al generar el plan inicial. Por favor, inténtelo de nuevo.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="projectName"
          render={({field}) => (
            <FormItem>
              <FormLabel>
                Nombre del Proyecto
                <Asterisk className="ml-1 text-red-500" />
              </FormLabel>
              <FormControl>
                <Input placeholder="Ej. Remodelación Apartamento Familia Pérez" {...field} />
              </FormControl>
              <FormDescription>¿Cuál es el nombre de su proyecto?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="projectDescription"
          render={({field}) => (
            <FormItem>
              <FormLabel>Descripción del Proyecto (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Ingrese detalles adicionales sobre el proyecto." {...field} />
              </FormControl>
              <FormDescription>Danos más detalles sobre tu proyecto.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="projectType"
          render={({field}) => (
            <FormItem>
              <FormLabel>
                Tipo de Proyecto
                <Asterisk className="ml-1 text-red-500" />
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo de proyecto" />
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
              <FormDescription>¿Qué tipo de proyecto es este?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="projectLocation"
          render={({field}) => (
            <FormItem>
              <FormLabel>Ubicación del Proyecto (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ingrese la dirección o ubicación general." {...field} />
              </FormControl>
              <FormDescription>¿Dónde está ubicado el proyecto?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="totalBudget"
          render={({field}) => (
            <FormItem>
              <FormLabel>
                Presupuesto Total
                <Asterisk className="ml-1 text-red-500" />
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Ingrese el presupuesto total estimado."
                  value={field.value === 0 ? '' : field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormDescription>¿Cuál es el presupuesto total para este proyecto?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currency"
          render={({field}) => (
            <FormItem>
              <FormLabel>Moneda</FormLabel>
              <FormControl>
                <Input placeholder="Ej. USD, EUR" {...field} />
              </FormControl>
              <FormDescription>¿Cuál es la moneda para el presupuesto?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="functionalRequirements"
          render={({field}) => (
            <FormItem>
              <FormLabel>
                Requisitos Funcionales
                <Asterisk className="ml-1 text-red-500" />
              </FormLabel>
              <FormControl>
                <Textarea placeholder="Ej. Necesitamos 3 habitaciones, 2 baños completos, una cocina abierta y un balcón amplio." {...field} />
              </FormControl>
              <FormDescription>¿Cuáles son los requisitos funcionales para este proyecto?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="aestheticPreferences"
          render={({field}) => (
            <FormItem>
              <FormLabel>Preferencias Estéticas (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Ej. Nos gusta el estilo moderno con acabados en madera y colores neutros." {...field} />
              </FormControl>
              <FormDescription>¿Cuáles son las preferencias estéticas para este proyecto?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Generar Planificación Inicial</Button>
      </form>
    </Form>
  );
};

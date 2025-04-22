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
import {generateInitialPlan} from '@/ai/flows/generate-initial-plan';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {useToast} from '@/hooks/use-toast';

interface ProjectDetailsFormProps {
  setProjectDetails: (details: ProjectDetails) => void;
  setInitialPlan: (plan: any) => void; // Update type as needed
}

const formSchema = z.object({
  projectName: z.string().min(2, {
    message: 'Project name must be at least 2 characters.',
  }),
  projectDescription: z.string().optional(),
  projectType: z.enum(['Casa nueva', 'Remodelación parcial', 'Remodelación total', 'Edificio residencial', 'Edificio comercial', 'Otro'], {
    required_error: 'Please select a project type.',
  }),
  projectLocation: z.string().optional(),
  totalBudget: z.number().min(1, {
    message: 'Total budget must be greater than 0.',
  }),
  currency: z.string().min(2).max(3, {
    message: 'Currency must be between 2 and 3 characters.',
  }),
  functionalRequirements: z.string().min(10, {
    message: 'Functional requirements must be at least 10 characters.',
  }),
  aestheticPreferences: z.string().optional(),
});

export const ProjectDetailsForm: React.FC<ProjectDetailsFormProps> = ({setProjectDetails, setInitialPlan}) => {
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
      const initialPlan = await generateInitialPlan(values);
      setInitialPlan(initialPlan);
      setProjectDetails(values);
    } catch (error: any) {
      console.error('Error generating initial plan:', error);
      toast({
        variant: 'destructive',
        title: 'Error generating plan',
        description: error.message || 'Failed to generate initial plan. Please try again.',
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
                Project Name
                <Asterisk className="ml-1 text-red-500" />
              </FormLabel>
              <FormControl>
                <Input placeholder="Ej. Remodelación Apartamento Familia Pérez" {...field} />
              </FormControl>
              <FormDescription>What is the name of your project?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="projectDescription"
          render={({field}) => (
            <FormItem>
              <FormLabel>Project Description (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Ingrese detalles adicionales sobre el proyecto." {...field} />
              </FormControl>
              <FormDescription>Give us more details about your project.</FormDescription>
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
                Project Type
                <Asterisk className="ml-1 text-red-500" />
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project type" />
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
              <FormDescription>What type of project is this?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="projectLocation"
          render={({field}) => (
            <FormItem>
              <FormLabel>Project Location (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ingrese la dirección o ubicación general." {...field} />
              </FormControl>
              <FormDescription>Where is the project located?</FormDescription>
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
                Total Budget
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
              <FormDescription>What is the total budget for this project?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currency"
          render={({field}) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <Input placeholder="e.g., USD, EUR" {...field} />
              </FormControl>
              <FormDescription>What is the currency for the budget?</FormDescription>
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
                Functional Requirements
                <Asterisk className="ml-1 text-red-500" />
              </FormLabel>
              <FormControl>
                <Textarea placeholder="Ej. Necesitamos 3 habitaciones, 2 baños completos, una cocina abierta y un balcón amplio." {...field} />
              </FormControl>
              <FormDescription>What are the functional requirements for this project?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="aestheticPreferences"
          render={({field}) => (
            <FormItem>
              <FormLabel>Aesthetic Preferences (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Ej. Nos gusta el estilo moderno con acabados en madera y colores neutros." {...field} />
              </FormControl>
              <FormDescription>What are the aesthetic preferences for this project?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Generate Initial Plan</Button>
      </form>
    </Form>
  );
};

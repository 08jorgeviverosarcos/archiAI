'use client';

import React from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';

import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {ProjectDetails} from '@/types';
import {generateInitialPlan} from '@/ai/flows/generate-initial-plan';

interface ProjectDetailsFormProps {
  setProjectDetails: (details: ProjectDetails) => void;
  setInitialPlan: (plan: any) => void; // Update type as needed
}

const formSchema = z.object({
  projectName: z.string().min(2, {
    message: 'Project name must be at least 2 characters.',
  }),
  projectDescription: z.string().optional(),
  projectType: z.string().min(2, {
    message: 'Project type must be at least 2 characters.',
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
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: '',
      projectDescription: '',
      projectType: '',
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
    } catch (error) {
      console.error('Error generating initial plan:', error);
      // TODO: Implement toast message
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
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input placeholder="Project Name" {...field} />
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
              <FormLabel>Project Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe your project" {...field} />
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
              <FormLabel>Project Type</FormLabel>
              <FormControl>
                <Input placeholder="e.g., New House, Renovation" {...field} />
              </FormControl>
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
              <FormLabel>Project Location</FormLabel>
              <FormControl>
                <Input placeholder="Project Location" {...field} />
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
              <FormLabel>Total Budget</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Total Budget" {...field} />
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
              <FormLabel>Functional Requirements</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., 3 bedrooms, 2 bathrooms, open kitchen" {...field} />
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
              <FormLabel>Aesthetic Preferences</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Modern, Minimalist" {...field} />
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

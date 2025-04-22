export interface ProjectDetails {
  projectName: string;
  projectDescription?: string;
  projectType: string;
  projectLocation?: string;
  totalBudget: number;
  currency: string;
  functionalRequirements: string;
  aestheticPreferences?: string;
}

export interface InitialPlan {
  phaseName: string;
  estimatedDuration: number;
  estimatedCost: number;
}

export interface ProjectDetails {
  projectName: string;
  projectDescription?: string;
  projectType: 'Casa nueva' | 'Remodelación parcial' | 'Remodelación total' | 'Edificio residencial' | 'Edificio comercial' | 'Otro';
  projectLocation?: string;
  totalBudget: number;
  currency: string;
  functionalRequirements: string;
  aestheticPreferences?: string;
}

export interface InitialPlan {
  phaseId: string;
  phaseName: string;
  estimatedDuration: number;
  estimatedCost: number;
}


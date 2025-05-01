
export interface ProjectDetails {
  _id?: string; // Optional: ObjectId from MongoDB
  projectId?: string // Optional: Keep if used elsewhere, but _id is standard
  projectName: string;
  projectDescription?: string;
  projectType: 'Casa nueva' | 'Remodelación parcial' | 'Remodelación total' | 'Edificio residencial' | 'Edificio comercial' | 'Otro';
  projectLocation?: string;
  totalBudget: number;
  currency: string;
  functionalRequirements: string;
  aestheticPreferences?: string;
  initialPlanId?: string; // ID of the associated InitialPlan document
  totalEstimatedCost?: number; // Add this if needed on the frontend Project object
  createdAt?: Date; // Add timestamps if needed on frontend
  updatedAt?: Date;
}

export interface InitialPlan {
  phaseId: string; // UUID for frontend key/reference
  phaseName: string;
  estimatedDuration: number; // Keep name consistent
  estimatedCost: number;
  order: number; // Add order field
}

// New type for the data structure of the InitialPlan document
export interface InitialPlanDocument {
    _id?: string; // MongoDB ObjectId
    projectId: string; // Reference to Project _id
    phases: InitialPlan[];
    totalEstimatedCost: number;
    createdAt?: Date;
    updatedAt?: Date;
}

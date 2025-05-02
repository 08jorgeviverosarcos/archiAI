

export interface ProjectDetails {
  _id?: string; // Optional: ObjectId from MongoDB
  projectId?: string // Optional: Keep if used elsewhere, but _id is standard
  projectName: string;
  projectDescription?: string;
  projectType: string; // Keep as string, validation can be done elsewhere if needed
  projectLocation?: string;
  totalBudget: number;
  currency: string;
  functionalRequirements: string;
  aestheticPreferences?: string;
  // initialPlanId?: string; // This is implicitly handled by the InitialPlan document's projectId field now
  totalEstimatedCost?: number; // Cost calculated from InitialPlan phases
  createdAt?: Date; // Add timestamps if needed on frontend
  updatedAt?: Date;
}

export interface InitialPlanPhase {
  _id?: string; // Optional MongoDB ObjectId if phases are subdocuments with own IDs
  phaseId: string; // UUID for frontend key/reference, keep as string
  phaseName: string;
  estimatedDuration: number; // Use consistent name
  estimatedCost: number;
  order: number; // Add order field
}

// New type for the data structure of the InitialPlan document fetched from API
export interface InitialPlanDocument {
    _id?: string; // MongoDB ObjectId
    projectId: string; // Reference to Project _id
    phases: InitialPlanPhase[];
    totalEstimatedCost: number;
    createdAt?: Date;
    updatedAt?: Date;
}


// New Task interface
export interface Task {
    _id?: string; // MongoDB ObjectId
    projectId: string; // Reference to Project _id (as string or ObjectId depending on backend)
    phaseUUID: string; // UUID of the associated phase (from InitialPlanPhase.phaseId)
    title: string;
    description?: string;
    quantity: number;
    unitOfMeasure: string; // e.g., 'm²', 'unitario', 'kg', 'hr'
    unitPrice: number;
    status: 'Pendiente' | 'En Progreso' | 'Realizado';
    profitMargin?: number; // Optional percentage
    laborCost?: number; // Optional estimated labor cost
    estimatedCost: number; // Calculated: quantity * unitPrice + laborCost (if applicable)
    createdAt?: Date;
    updatedAt?: Date;
}

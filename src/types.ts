
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
  tasks?: Task[]; // Optional tasks array for potential population
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


// Updated Task interface
export interface Task {
    _id?: string; // MongoDB ObjectId
    projectId: string; // Reference to Project _id (as string or ObjectId depending on backend)
    phaseUUID: string; // UUID of the associated phase (from InitialPlanPhase.phaseId)
    title: string;
    description?: string;
    quantity: number;
    unitOfMeasure: string; // e.g., 'm²', 'unitario', 'kg', 'hr'
    unitPrice: number;
    estimatedDuration?: number | null; // Estimated duration in days, allow null
    estimatedCost: number; // Calculated: quantity * unitPrice + laborCost (if applicable)
    status: 'Pendiente' | 'En Progreso' | 'Realizado';
    profitMargin?: number | null; // Optional percentage, allow null
    laborCost?: number | null; // Optional estimated labor cost, allow null
    executionPercentage?: number | null; // Percentage of completion (0-100), allow null
    startDate?: Date | string | null; // Planned/Actual start date, allow null, accept string from form
    endDate?: Date | string | null; // Planned/Actual end date, allow null, accept string from form
    createdAt?: Date;
    updatedAt?: Date;
}

// MaterialProject interface
export interface MaterialProject {
  _id?: string; // MongoDB ObjectId
  projectId: string; // Reference to Project _id
  title: string; // Added title
  referenceCode: string;
  brand: string;
  supplier: string;
  description: string;
  unitOfMeasure: string;
  estimatedUnitPrice: number;
  profitMargin?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// MaterialTask interface
export interface MaterialTask {
  _id?: string; // MongoDB ObjectId
  taskId: string; // Reference to Task _id
  materialProjectId: string | MaterialProject; // Reference to MaterialProject _id, can be populated
  phaseId: string; // Reference to the phase this task (and thus material usage) belongs to
  quantityUsed: number;
  materialCostForTask?: number; // Calculated: quantityUsed * unitPriceOfMaterialProject
  profitMarginForTaskMaterial?: number | null; // Copied from MaterialProject or task-specific
  purchasedValueForTask?: number | null; // Specific purchased value for this task's material usage
  createdAt?: Date;
  updatedAt?: Date;
}

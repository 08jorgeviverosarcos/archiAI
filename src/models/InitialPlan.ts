import mongoose, { Document, Schema, Model } from 'mongoose';
import { InitialPlan as InitialPlanType } from '@/types'; // Renamed import to avoid conflict

interface IPhase extends InitialPlanType {
  order: number; // Add order field
}

export interface IInitialPlan extends Document {
  projectId: Schema.Types.ObjectId; // Reference back to the Project
  phases: IPhase[];
  totalEstimatedCost: number;
  createdAt: Date;
  updatedAt: Date;
}

const phaseSchema = new Schema<IPhase>(
  {
    phaseId: { type: String, required: true, unique: true }, // Keep UUID for frontend use if needed
    phaseName: { type: String, required: true },
    estimatedDuration: { type: Number, required: true },
    estimatedCost: { type: Number, required: true },
    order: { type: Number, required: true }, // Add order field
  },
  { _id: false } // Don't create separate _id for subdocuments if not needed
);


const initialPlanSchema = new Schema<IInitialPlan>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    phases: [phaseSchema], // Embed the phase schema
    totalEstimatedCost: { type: Number, required: true },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Define the InitialPlan model
const InitialPlan: Model<IInitialPlan> = mongoose.models.InitialPlan || mongoose.model<IInitialPlan>('InitialPlan', initialPlanSchema);

export default InitialPlan;

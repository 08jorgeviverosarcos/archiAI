
import mongoose, { Document, Schema, Model } from 'mongoose';
import { InitialPlanPhase as InitialPlanPhaseType } from '@/types'; // Use type alias

// Interface for embedded Phase subdocument matching the type
interface IPhaseSubdocument extends InitialPlanPhaseType, Document {
    // _id will be automatically added by Mongoose unless explicitly disabled
    _id: Schema.Types.ObjectId;
}


export interface IInitialPlan extends Document {
  projectId: Schema.Types.ObjectId; // Reference back to the Project
  phases: IPhaseSubdocument[]; // Use the subdocument interface
  totalEstimatedCost: number;
  createdAt: Date;
  updatedAt: Date;
}

// Schema for the embedded Phase document
const phaseSchema = new Schema<IPhaseSubdocument>(
  {
    // Mongoose adds _id by default
    phaseId: { type: String, required: true, unique: true, index: true }, // Keep UUID for frontend use, ensure it's indexed if unique
    phaseName: { type: String, required: true },
    estimatedDuration: { type: Number, required: true },
    estimatedCost: { type: Number, required: true },
    order: { type: Number, required: true, index: true }, // Index order for sorting
  },
  { _id: true } // Explicitly enable _id for subdocuments if needed, otherwise Mongoose adds it.
);


const initialPlanSchema = new Schema<IInitialPlan>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true }, // Index projectId
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

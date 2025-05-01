import mongoose, { Document, Schema, Model } from 'mongoose';
import { ProjectDetails } from '@/types'; // Assuming types are defined here

export interface IProject extends ProjectDetails, Document {
  initialPlan?: Schema.Types.ObjectId | null; // Reference to InitialPlan document
  totalEstimatedCost?: number;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    projectName: { type: String, required: true },
    projectDescription: { type: String },
    projectType: { type: String, required: true },
    projectLocation: { type: String },
    totalBudget: { type: Number, required: true },
    currency: { type: String, required: true },
    functionalRequirements: { type: String, required: true },
    aestheticPreferences: { type: String },
    // Reference the InitialPlan model
    initialPlan: { type: Schema.Types.ObjectId, ref: 'InitialPlan', default: null },
    totalEstimatedCost: { type: Number },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Define the project model
const Project: Model<IProject> = mongoose.models.Project || mongoose.model<IProject>('Project', projectSchema);

export default Project;

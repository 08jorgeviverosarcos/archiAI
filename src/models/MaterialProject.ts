
import mongoose, { Document, Schema, Model } from 'mongoose';
import type { MaterialProject as MaterialProjectType } from '@/types'; // Use type alias

export interface IMaterialProject extends MaterialProjectType, Document {
  _id: Schema.Types.ObjectId;
}

const materialProjectSchema = new Schema<IMaterialProject>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    referenceCode: { type: String, required: true },
    brand: { type: String, required: true },
    supplier: { type: String, required: true },
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    unitOfMeasure: { type: String, required: true },
    estimatedUnitPrice: { type: Number, required: true, min: 0, default: 0 },
    purchasedValue: { type: Number, required: true, min: 0, default: 0 }, // Total value for the purchased quantity
    profitMargin: { type: Number, min: 0, default: 0 },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Ensure referenceCode is unique per projectId
materialProjectSchema.index({ projectId: 1, referenceCode: 1 }, { unique: true });

const MaterialProject: Model<IMaterialProject> =
  mongoose.models.MaterialProject || mongoose.model<IMaterialProject>('MaterialProject', materialProjectSchema);

export default MaterialProject;

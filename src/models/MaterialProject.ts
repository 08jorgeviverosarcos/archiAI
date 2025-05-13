
import mongoose, { Document, Schema, Model } from 'mongoose';
import type { MaterialProject as MaterialProjectType } from '@/types'; // Use type alias

export interface IMaterialProject extends MaterialProjectType, Document {
  _id: Schema.Types.ObjectId;
}

const unitsOfMeasureValues = [
  'm', 'm²', 'm³', 'kg', 'L', 'gal', 'unidad', 'caja', 'rollo', 'bolsa', 'hr', 'día', 'semana', 'mes', 'global', 'pulg', 'pie', 'yd', 'ton', 'lb'
] as const;


const materialProjectSchema = new Schema<IMaterialProject>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true },
    referenceCode: { type: String, trim: true, required: false },
    brand: { type: String, trim: true, required: false },
    supplier: { type: String, trim: true, required: false },
    description: { type: String, trim: true, required: false },
    unitOfMeasure: { type: String, required: true, enum: unitsOfMeasureValues },
    estimatedUnitPrice: { type: Number, required: true, min: 0, default: 0 },
    profitMargin: { type: Number, min: 0, default: null, required: false },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// The following index was removed as per user request to allow duplicate and null referenceCodes.
// materialProjectSchema.index({ projectId: 1, referenceCode: 1 }, { unique: true, sparse: true });


const MaterialProject: Model<IMaterialProject> =
  mongoose.models.MaterialProject || mongoose.model<IMaterialProject>('MaterialProject', materialProjectSchema);

export default MaterialProject;


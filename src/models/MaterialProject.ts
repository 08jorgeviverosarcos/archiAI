
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
    referenceCode: { type: String, trim: true, required: false, default: null }, 
    brand: { type: String, trim: true, required: false, default: null }, 
    supplier: { type: String, trim: true, required: false, default: null }, 
    description: { type: String, trim: true, required: false, default: null }, 
    unitOfMeasure: { type: String, required: true, enum: unitsOfMeasureValues },
    estimatedUnitPrice: { type: Number, required: true, min: 0, default: 0 },
    profitMargin: { type: Number, min: 0, required: false, default: null },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Removed the unique index for referenceCode:
// materialProjectSchema.index({ projectId: 1, referenceCode: 1 }, { unique: true, sparse: true }); 

const MaterialProject: Model<IMaterialProject> =
  mongoose.models.MaterialProject || mongoose.model<IMaterialProject>('MaterialProject', materialProjectSchema);

export default MaterialProject;

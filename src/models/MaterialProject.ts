
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
    // Optional string fields are optional by default (no 'required: true').
    // 'trim: true' applies if a string value is given.
    // Passing 'null' to these fields from the API is valid.
    referenceCode: { type: String, trim: true }, 
    brand: { type: String, trim: true }, 
    supplier: { type: String, trim: true }, 
    description: { type: String, trim: true }, 
    unitOfMeasure: { type: String, required: true, enum: unitsOfMeasureValues },
    estimatedUnitPrice: { type: Number, required: true, min: 0, default: 0 },
    // For optional number fields that can be null, 'default: null' handles cases where the field is omitted.
    // 'required: false' explicitly states it's not mandatory.
    profitMargin: { type: Number, min: 0, default: null, required: false },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

const MaterialProject: Model<IMaterialProject> =
  mongoose.models.MaterialProject || mongoose.model<IMaterialProject>('MaterialProject', materialProjectSchema);

export default MaterialProject;


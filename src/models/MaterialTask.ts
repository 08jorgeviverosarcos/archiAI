
import mongoose, { Document, Schema, Model } from 'mongoose';
import type { MaterialTask as MaterialTaskType } from '@/types'; // Use type alias

export interface IMaterialTask extends MaterialTaskType, Document {
  _id: Schema.Types.ObjectId;
}

const materialTaskSchema = new Schema<IMaterialTask>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    materialProjectId: { type: Schema.Types.ObjectId, ref: 'MaterialProject', required: true, index: true },
    phaseId: { type: String, required: true, index: true }, // Storing phaseId (phaseUUID from Task) as requested
    quantityUsed: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

const MaterialTask: Model<IMaterialTask> =
  mongoose.models.MaterialTask || mongoose.model<IMaterialTask>('MaterialTask', materialTaskSchema);

export default MaterialTask;


import mongoose, { Document, Schema, Model } from 'mongoose';
import { Task as TaskType } from '@/types'; // Use TaskType alias

export interface ITask extends TaskType, Document {
  _id: Schema.Types.ObjectId; // Ensure _id is defined
}

const taskSchema = new Schema<ITask>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    phaseUUID: { type: String, required: true, index: true }, // Index for faster lookups
    title: { type: String, required: true },
    description: { type: String },
    quantity: { type: Number, required: true, default: 1 },
    unitOfMeasure: { type: String, required: true },
    unitPrice: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['Pendiente', 'En Progreso', 'Realizado'],
      default: 'Pendiente',
      required: true,
    },
    profitMargin: { type: Number, default: null, required: false }, // Optional, allow null
    laborCost: { type: Number, default: null, required: false }, // Optional, allow null
    estimatedCost: { type: Number, required: true }, // Calculated field, should be set during creation/update
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    // Remove pre-save hook for cost calculation to handle it in API routes
    // This provides more flexibility and avoids potential issues with update operations.
    toJSON: { virtuals: true }, // Ensure virtuals are included in JSON output
    toObject: { virtuals: true }, // Ensure virtuals are included when converting to object
  }
);


// Define the Task model
const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>('Task', taskSchema);

export default Task;

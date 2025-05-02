
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
    profitMargin: { type: Number }, // Optional
    laborCost: { type: Number }, // Optional
    estimatedCost: { type: Number, required: true }, // Calculated field, should be set during creation/update
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    // Auto-calculate estimatedCost before saving (example)
    pre: ['save', 'updateOne', 'findOneAndUpdate', 'updateMany'], // Add pre-hook for relevant update operations
    // Note: Complex pre-hooks might be better handled in service layer/API route logic
    // This example is basic. Consider transactionality for production.
    toJSON: { virtuals: true }, // Ensure virtuals are included in JSON output
    toObject: { virtuals: true }, // Ensure virtuals are included when converting to object
  }
);

// Example pre-save hook to calculate estimatedCost (can be more complex)
// Important: arrow functions don't bind `this` correctly in Mongoose hooks
taskSchema.pre<ITask>('save', function(next) {
  this.estimatedCost = (this.quantity * this.unitPrice) + (this.laborCost || 0);
  // Add profit margin calculation if needed:
  // if (this.profitMargin) {
  //   this.estimatedCost = this.estimatedCost * (1 + this.profitMargin / 100);
  // }
  next();
});

// Define the Task model
const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>('Task', taskSchema);

export default Task;

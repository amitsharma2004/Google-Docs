import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  user: Types.ObjectId;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'card' | 'paypal' | 'stripe' | 'other';
  transactionId?: string;
  plan: 'basic' | 'premium' | 'enterprise';
  billingPeriod: 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required']
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be positive']
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      uppercase: true,
      default: 'USD',
      maxlength: 3
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'paypal', 'stripe', 'other'],
      required: [true, 'Payment method is required']
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true
    },
    plan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      required: [true, 'Plan is required']
    },
    billingPeriod: {
      type: String,
      enum: ['monthly', 'yearly'],
      required: [true, 'Billing period is required']
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ endDate: 1 });

const Payment = mongoose.model<IPayment>('Payment', paymentSchema);

export default Payment;
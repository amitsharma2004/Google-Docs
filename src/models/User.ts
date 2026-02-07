import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription {
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled';
  startDate?: Date;
  endDate?: Date;
  autoRenew: boolean;
}

export interface IUsageLimits {
  documentsCreated: number;
  storageUsed: number; // in bytes
  collaboratorsAdded: number;
}

export interface IPlanLimits {
  maxDocuments: number;
  maxStorage: number; // in bytes
  maxCollaborators: number;
  maxAssetsPerDocument: number;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  subscription: ISubscription;
  usage: IUsageLimits;
  planLimits: IPlanLimits;
  createdAt: Date;
  updatedAt: Date;
  hasExceededLimit(limitType: 'documents' | 'storage' | 'collaborators'): boolean;
}

// Plan limits configuration
const PLAN_LIMITS = {
  free: {
    maxDocuments: 5,
    maxStorage: 100 * 1024 * 1024, // 100 MB
    maxCollaborators: 3,
    maxAssetsPerDocument: 10
  },
  basic: {
    maxDocuments: 50,
    maxStorage: 1024 * 1024 * 1024, // 1 GB
    maxCollaborators: 10,
    maxAssetsPerDocument: 50
  },
  premium: {
    maxDocuments: 500,
    maxStorage: 10 * 1024 * 1024 * 1024, // 10 GB
    maxCollaborators: 50,
    maxAssetsPerDocument: 200
  },
  enterprise: {
    maxDocuments: -1, // unlimited
    maxStorage: -1, // unlimited
    maxCollaborators: -1, // unlimited
    maxAssetsPerDocument: -1 // unlimited
  }
};

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    avatar: {
      type: String,
      default: null
    },
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'basic', 'premium', 'enterprise'],
        default: 'free'
      },
      status: {
        type: String,
        enum: ['active', 'expired', 'cancelled'],
        default: 'active'
      },
      startDate: {
        type: Date
      },
      endDate: {
        type: Date
      },
      autoRenew: {
        type: Boolean,
        default: false
      }
    },
    usage: {
      documentsCreated: {
        type: Number,
        default: 0,
        min: 0
      },
      storageUsed: {
        type: Number,
        default: 0,
        min: 0
      },
      collaboratorsAdded: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    planLimits: {
      maxDocuments: {
        type: Number,
        default: PLAN_LIMITS.free.maxDocuments
      },
      maxStorage: {
        type: Number,
        default: PLAN_LIMITS.free.maxStorage
      },
      maxCollaborators: {
        type: Number,
        default: PLAN_LIMITS.free.maxCollaborators
      },
      maxAssetsPerDocument: {
        type: Number,
        default: PLAN_LIMITS.free.maxAssetsPerDocument
      }
    }
  },
  {
    timestamps: true
  }
);

// Index for faster email lookups
userSchema.index({ email: 1 });
userSchema.index({ 'subscription.plan': 1 });
userSchema.index({ 'subscription.status': 1 });

// Method to check if user has exceeded limits
userSchema.methods.hasExceededLimit = function(
  limitType: 'documents' | 'storage' | 'collaborators'
): boolean {
  const limits = this.planLimits;
  const usage = this.usage;

  switch (limitType) {
    case 'documents':
      return limits.maxDocuments !== -1 && usage.documentsCreated >= limits.maxDocuments;
    case 'storage':
      return limits.maxStorage !== -1 && usage.storageUsed >= limits.maxStorage;
    case 'collaborators':
      return limits.maxCollaborators !== -1 && usage.collaboratorsAdded >= limits.maxCollaborators;
    default:
      return false;
  }
};

// Pre-save hook to update plan limits when subscription plan changes
userSchema.pre('save', function(next: any) {
  if (this.isModified('subscription.plan')) {
    const plan = this.subscription.plan;
    this.planLimits = PLAN_LIMITS[plan];
  }
  next();
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;
export { PLAN_LIMITS };
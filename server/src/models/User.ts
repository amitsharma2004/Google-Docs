import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'changeme_secret';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY ?? '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY ?? '7d';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  refreshToken?: string;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  generateTokens(): { accessToken: string; refreshToken: string };
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    name:  { type: String, required: true, trim: true },
    refreshToken: { type: String },
  },
  { timestamps: true },
);

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method for password comparison
UserSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

// Instance method to generate access and refresh tokens
UserSchema.methods.generateTokens = function (): { accessToken: string; refreshToken: string } {
  const payload = {
    userId: this._id.toString(),
    email: this.email,
  };

  // Generate access token (short-lived)
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '1h',
  });

  // Generate refresh token (long-lived)
  const refreshToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
  });

  return { accessToken, refreshToken };
};

export default mongoose.model<IUser>('User', UserSchema);
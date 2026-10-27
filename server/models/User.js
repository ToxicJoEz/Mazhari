import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters'],
    },
    mobile: {
      type: String,
      required: [true, 'Please provide a contact phone number for delivery confirmation'],
      trim: true,
    },
    tokenVersion: { type: Number, default: 0 },
    role: {
      type: String,
      enum: ['customer', 'moderator', 'admin'],
      default: 'customer',
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    addresses: [
      {
        street: { type: String, required: true },
        city: { type: String, required: true },
        governorate: { type: String, default: '' },
        zip: { type: String, default: '' },
        isDefault: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare entered password with hashed password in database
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', UserSchema);

import mongoose from "mongoose";

const trainingProfileSchema = new mongoose.Schema(
  {
    experienceLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },

    // IANA timezone, e.g. "America/Los_Angeles"
    timezone: { type: String, default: "" },

    unitsPreference: { type: String, enum: ["mi", "km"], default: "mi" },

    availability: {
      daysPerWeek: { type: Number, default: null, min: 1, max: 7 },
      timePerDayMinutes: { type: Number, default: null, min: 10, max: 240 },
      preferredLongRunDay: {
        type: String,
        enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
        default: null,
      },
      constraints: { type: String, default: "", maxlength: 500 },
    },

    goalRace: {
      name: { type: String, default: "", maxlength: 120 },
      dateISO: { type: String, default: "" },
      distanceLabel: { type: String, default: "", maxlength: 40 },
      targetTimeMinutes: { type: Number, default: null, min: 10, max: 600 },
    },

    zones: {
      // Store either pace ranges (min/mi) or HR ranges. Keep flexible.
      easy: {
        paceMinPerMileLow: { type: Number, default: null, min: 3, max: 30 },
        paceMinPerMileHigh: { type: Number, default: null, min: 3, max: 30 },
        hrBpmLow: { type: Number, default: null, min: 40, max: 240 },
        hrBpmHigh: { type: Number, default: null, min: 40, max: 240 },
      },
      tempo: {
        paceMinPerMileLow: { type: Number, default: null, min: 3, max: 30 },
        paceMinPerMileHigh: { type: Number, default: null, min: 3, max: 30 },
        hrBpmLow: { type: Number, default: null, min: 40, max: 240 },
        hrBpmHigh: { type: Number, default: null, min: 40, max: 240 },
      },
      intervals: {
        paceMinPerMileLow: { type: Number, default: null, min: 3, max: 30 },
        paceMinPerMileHigh: { type: Number, default: null, min: 3, max: 30 },
        hrBpmLow: { type: Number, default: null, min: 40, max: 240 },
        hrBpmHigh: { type: Number, default: null, min: 40, max: 240 },
      },
      long: {
        paceMinPerMileLow: { type: Number, default: null, min: 3, max: 30 },
        paceMinPerMileHigh: { type: Number, default: null, min: 3, max: 30 },
        hrBpmLow: { type: Number, default: null, min: 40, max: 240 },
        hrBpmHigh: { type: Number, default: null, min: 40, max: 240 },
      },
      threshold: {
        paceMinPerMile: { type: Number, default: null, min: 3, max: 30 },
        hrBpm: { type: Number, default: null, min: 40, max: 240 },
      },
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },

    trainingProfile: { type: trainingProfileSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);

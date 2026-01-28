import mongoose from "mongoose";

const workoutSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["easy", "workout", "long", "race"],
      default: "easy",
    },

    title: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    // Core metrics (always present for a workout)
    distanceMeters: { type: Number, required: true, min: 0 },
    durationSeconds: { type: Number, required: true, min: 0 },

    // Useful optional metrics (nullable for non-HR devices / missing data)
    avgSpeedMps: { type: Number, default: null, min: 0 },
    maxSpeedMps: { type: Number, default: null, min: 0 },

    elevationGainM: { type: Number, default: null, min: 0 },
    elevHighM: { type: Number, default: null },
    elevLowM: { type: Number, default: null },

    hasHeartrate: { type: Boolean, default: false },
    avgHeartRateBpm: { type: Number, default: null, min: 0 },
    maxHeartRateBpm: { type: Number, default: null, min: 0 },

    avgCadenceSpm: { type: Number, default: null, min: 0 },

    sufferScore: { type: Number, default: null, min: 0 },
    perceivedEffort: { type: Number, default: null, min: 1, max: 10 },

    sportType: {
      type: String,
      default: "Run",
      trim: true,
      maxlength: 30,
    },

    startDateLocal: { type: Date, default: null },
    timezone: { type: String, default: "" },
    utcOffsetSeconds: { type: Number, default: null },

    deviceName: { type: String, default: "" },

    metricsVersion: { type: Number, default: 1 },

    ingestedAt: { type: Date, default: Date.now },

    source: {
      provider: {
        type: String,
        enum: ["manual", "strava"],
        default: "manual",
      },
      activityId: { type: String, index: true },
    },
  },
  {
    timestamps: true,
  },
);

// Idempotency key for Strava imports/sync
workoutSchema.index(
  { user: 1, "source.provider": 1, "source.activityId": 1 },
  { unique: true, sparse: true },
);

export default mongoose.model("Workout", workoutSchema);

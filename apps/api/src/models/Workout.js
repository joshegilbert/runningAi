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

    distanceMeters: {
      type: Number,
      required: true,
      min: 0,
    },

    durationSeconds: {
      type: Number,
      required: true,
      min: 0,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

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

workoutSchema.index(
  { user: 1, "source.provider": 1, "source.activityId": 1 },
  { unique: true, sparse: true },
);

export default mongoose.model("Workout", workoutSchema);

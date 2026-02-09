import mongoose from "mongoose";

const rawStravaActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["strava"],
      default: "strava",
      index: true,
    },

    activityId: {
      type: String,
      required: true,
      index: true,
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    payloadVersion: {
      type: Number,
      default: 1,
    },

    fetchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

rawStravaActivitySchema.index(
  { user: 1, provider: 1, activityId: 1 },
  { unique: true },
);

export default mongoose.model("RawStravaActivity", rawStravaActivitySchema);

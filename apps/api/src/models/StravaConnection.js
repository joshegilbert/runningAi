import mongoose from "mongoose";

const stravaConnectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    athleteId: {
      type: Number,
      required: true,
      index: true,
    },

    accessToken: {
      type: String,
      required: true,
    },

    refreshToken: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Number,
      required: true,
    },

    scope: {
      type: String,
      default: "",
    },

    connectedAt: {
      type: Date,
      default: Date.now,
    },

    lastSyncAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("StravaConnection", stravaConnectionSchema);

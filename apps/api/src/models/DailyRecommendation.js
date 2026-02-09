import mongoose from "mongoose";

const dailyRecommendationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Store one recommendation per user per day (UTC day)
    date: { type: Date, required: true, index: true },

    headline: { type: String, required: true, maxlength: 120 },
    details: { type: String, default: "", maxlength: 2000 },

    // Keep it simple but structured
    workout: {
      type: {
        type: String,
        enum: ["easy", "tempo", "intervals", "long", "rest"],
        required: true,
      },
      durationMinutes: { type: Number, default: null, min: 0 },
      distanceMiles: { type: Number, default: null, min: 0 },
    },

    meta: {
      provider: { type: String, default: "llm" },
      model: { type: String, default: "" },
      inputs: { type: Object, default: {} }, // small summary only
      raw: { type: String, default: "" }, // optional: store raw LLM output for debugging
    },
  },
  { timestamps: true },
);

dailyRecommendationSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model("DailyRecommendation", dailyRecommendationSchema);

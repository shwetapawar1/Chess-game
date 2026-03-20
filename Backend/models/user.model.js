const mongoose = require("mongoose");
// name
// email
// passwordHash
// role -> admin/user
// avatar
// stats : {rating, wins, losses, draws, currentStreak, maxStreak}
const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "USER", enum: ["ADMIN", "USER"] },
    avatar: { type: String, default: "" },
    stats: {
      rating: { type: Number, default: 1200 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      draws: { type: Number, default: 0 },
      gamesPlayed: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      bestStreak: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
module.exports = { User };
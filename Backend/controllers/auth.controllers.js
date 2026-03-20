const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models/user.model");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Please fill all the fields" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User does not exist" });
    }
    // 1 - verify password (bcrypt)
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    // 2 - create access token and refresh token (jwt)
    const accessToken = jwt.sign(
      { sub: user._id, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" },
    );
    res.cookie("accessToken", accessToken, {
      httpOnly: true, // javascript cannot read the cookie, only browser can read it
      secure: process.env.NODE_ENV === "production", // send cookie only to https secure sites
      maxAge: 15 * 60 * 1000,
    });
    const refreshToken = jwt.sign(
      { sub: user._id, role: user.role, type: "refresh" },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, // javascript cannot read the cookie, only browser can read it
      secure: process.env.NODE_ENV === "production", // send cookie only to https secure sites
      path: "/api/v1/auth/refresh",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.status(200).json({ message: "OK" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all the fields" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const user = new User({ name, email, passwordHash });
    const savedUser = await user.save();
    if (!savedUser) {
      return res.status(500).json({ message: "Unable to save user" });
    }
    return res.status(200).json({ message: "OK" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const fetchMe = (req, res) => {
  try {
    const user = req.user;
    return res.status(200).json({ user });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const logout = (req, res) => {
  try {
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/api/v1/auth/refresh",
    });
    return res.status(200).json({ message: "OK" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token missing" });
    }
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    if (payload.type !== "refresh") {
      return res.status(400).json({ message: "Token type not refresh" });
    }
    const id = payload.sub;
    const user = await User.findById(id);
    if (!user) {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/api/v1/auth/refresh",
      });
      return res.status(400).json({ message: "User not found" });
    }
    const accessToken = jwt.sign(
      { sub: user._id, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" },
    );
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000,
    });
    return res.status(200).json({ message: "OK" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { login, signup, fetchMe, logout, refresh };
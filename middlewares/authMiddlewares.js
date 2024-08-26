const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");

exports.generateAccessToken = (user) => {
  try {
    const userPayload = {
      id: user.id,
      name: user.firstName + " " + user.lastName,
      emailId: user.emailId,
    };
    return jwt.sign(userPayload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "15m",
    });
  } catch (error) {
    console.log("Error in generating Access Token:", error);
    throw new Error("Access Token generation failed");
  }
};

exports.generateRefreshToken = async (user) => {
  try {
    const userPayload = {
      id: user.id,
      emailId: user.emailId,
    };
    const refreshToken = jwt.sign(
      userPayload,
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "24h",
      }
    );
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    return {
      refreshToken: refreshToken,
      hashedRefreshToken: hashedRefreshToken,
    };
  } catch (error) {
    console.log("Error in generating Refresh Token:", error);
    throw new Error("Refresh Token generation failed");
  }
};

exports.validateAccessToken = (req, res, next) => {
  const authHeaders = req.headers["authorization"];
  const accessToken = authHeaders && authHeaders.split(" ")[1];
  if (!accessToken) {
    return res.status(401).json(new ApiError(401, "Unauthorized"));
  }
  jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json(new ApiError(403, "Forbidden"));
    }
    req.user = user;
    next();
  });
};

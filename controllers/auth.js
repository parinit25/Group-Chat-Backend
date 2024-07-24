const {
  generateAccessToken,
  generateRefreshToken,
} = require("../middlewares/authMiddlewares");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.userLogin = async (req, res) => {
  const { emailId, password } = req.body;
  console.log(emailId, password);
  try {
    if (!emailId || !password) {
      return res
        .status(400)
        .json(new ApiError(400, "Email and password are required"));
    }
    const existingUser = await User.findOne({ where: { emailId: emailId } });
    if (!existingUser) {
      return res.status(401).json(new ApiError(401, "Incorrect Credentials"));
    }
    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password
    ); // Added await
    if (isPasswordValid) {
      const accessToken = await generateAccessToken(existingUser);
      const { refreshToken, hashedRefreshToken } = await generateRefreshToken(
        existingUser
      );
      console.log(refreshToken, hashedRefreshToken, "user");
      await User.update(
        { refreshToken: hashedRefreshToken },
        { where: { emailId: emailId } }
      );
      console.log(refreshToken);
      return res.status(200).json(
        new ApiResponse(200, "Login Success", {
          accessToken: accessToken,
          refreshToken: refreshToken,
        })
      );
    } else {
      return res.status(401).json(new ApiError(401, "Wrong Credentials"));
    }
  } catch (error) {
    console.log("Error in user login:", error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

exports.userSignup = async (req, res) => {
  const { firstName, lastName, emailId, password, phoneNumber } = req.body;
  console.log(firstName, lastName, emailId, password, phoneNumber);
  try {
    if (!firstName || !lastName || !emailId || !password || !phoneNumber) {
      // Validate all required fields
      return res.status(400).json(new ApiError(400, "All fields are required"));
    }
    const existingUserEmail = await User.findOne({
      where: { emailId: emailId },
    }); // Added await
    if (existingUserEmail) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "There is already a account associated with this email id"
          )
        );
    }
    const existingUserPhoneNumber = await User.findOne({
      where: { phoneNumber: phoneNumber },
    });
    if (existingUserPhoneNumber) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "There is already a account associated with this phone number"
          )
        );
    }
    const encryptedPassword = await bcrypt.hash(password, 10); // Added await
    const newUser = await User.create({
      firstName,
      lastName,
      phoneNumber,
      password: encryptedPassword, // Corrected field name
      emailId,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, "User created Successfully"));
  } catch (error) {
    console.log("Error In Signup:", error);
    res
      .status(500)
      .json(new ApiError(500, "Something went wrong from the controller"));
  }
};

exports.refreshAccessToken = async (req, res) => {
  const { refreshToken, emailId } = req.body;
  try {
    if (!refreshToken || !emailId) {
      return res
        .status(400)
        .json(new ApiError(400, "Validation Error Occured"));
    }
    const user = await User.findOne({ where: { emailId: emailId } });
    if (!user) {
      return res.status(404).json(new ApiError(404, "User Not Found"));
    }

    // Verify the refresh token
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, decoded) => {
        if (err) {
          return res
            .status(400)
            .json(new ApiError(400, "Invalid Refresh Token"));
        }
        const isTokenValid = await bcrypt.compare(
          refreshToken,
          user.refreshToken
        );
        if (!isTokenValid) {
          return res
            .status(400)
            .json(new ApiError(400, "Invalid Refresh Token"));
        }

        const accessToken = generateAccessToken(user);
        return res
          .status(200)
          .json(new ApiResponse(200, "Access Token Refreshed", accessToken));
      }
    );
  } catch (error) {
    console.log("Error in refreshing access Token:", error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

exports.getUserInfo = async (req, res) => {
  const { id } = req.user;
  try {
    if (!id) {
      return res.status(404).json(new ApiError(404, "User Not Found"));
    }
    const foundUser = await User.findByPk(id);
    if (!foundUser) {
      return res.status(404).json(new ApiError(404, "User Not Found"));
    }
    const userPayload = {
      id: foundUser.id,
      emailId: foundUser.emailId,
      phoneNumber: foundUser.phoneNumber,
      firstName: foundUser.firstName,
      lastName: foundUser.lastName,
    };
    return res
      .status(200)
      .json(
        new ApiResponse(200, "User Details Fetched Successfully", userPayload)
      );
  } catch (error) {
    console.log("Error in fetching the user details:", error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

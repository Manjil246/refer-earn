import bcrypt from "bcryptjs"; // Import bcrypt for password hashing
import jwt from "jsonwebtoken"; // Import jwt for token generation
import { v4 as uuidv4 } from "uuid"; // Import uuid for generating unique referral codes
import User from "../models/User.js"; // Import User model

// Function to generate a referral code
const generateReferralCode = () => {
  return uuidv4().substring(0, 8).toUpperCase(); // Generate a unique code and convert to uppercase
};

// Signup function
const signup = async (req, res) => {
  const { username, password, referralCode } = req.body; // Extract username, password, and referral code from request body

  const existingUser = await User.findOne({ username }); // Check if username already exists
  if (existingUser)
    return res.status(400).json({ message: "Username already exists." }); // Return error if username exists

  let referredBy = null; // Initialize referredBy as null

  if (referralCode) {
    referredBy = await User.findOne({ referralCode }); // Find user by referral code
    if (!referredBy)
      return res.status(400).json({ message: "Invalid referral code." }); // Return error if referral code is invalid
    if (referredBy.referrals.length >= 8)
      return res.status(400).json({ message: "Referral limit reached." }); // Return error if referral limit is reached
  }

  let user = new User({
    username,
    password,
    referralCode: generateReferralCode(), // Generate a new referral code for the user
    referredBy: referredBy ? referredBy._id : null, // Set referredBy if referral code is valid
  });

  if (referredBy) referredBy.referrals.push(user._id); // Add user to referrals of referredBy

  await user.save(); // Save the new user
  if (referredBy) await referredBy.save(); // Save the referredBy user

  res.status(200).json({ message: "User registered successfully." }); // Return success message
};

// Login function
const login = async (req, res) => {
  const { username, password } = req.body; // Extract username and password from request body
  const user = await User.findOne({ username }).select("+password"); // Find user by username and include password
  if (!user)
    return res.status(400).json({ message: "Invalid username or password." }); // Return error if user not found

  const validPassword = await bcrypt.compare(password, user.password); // Compare password with hashed password
  if (!validPassword)
    return res.status(400).json({ message: "Invalid username or password." }); // Return error if password is invalid

  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET_KEY); // Generate JWT token
  res
    .cookie("token", token, { httpOnly: true }) // Set token in HTTP-only cookie
    .status(200)
    .json({ message: "Logged in successfully." }); // Return success message
};

// Get user details function
const getUserDetails = async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    "referredBy referrals"
  ); // Find user by ID and populate referredBy and referrals
  res.status(200).json({
    referralCode: user.referralCode, // Return referral code
    directEarnings: user.directEarnings, // Return direct earnings
    indirectEarnings: user.indirectEarnings, // Return indirect earnings
    referredBy: user.referredBy, // Return referredBy user
    referrals: user.referrals, // Return referrals
  });
};

// Get parent referral function
const getParent = async (req, res) => {
  const user = await User.findById(req.user._id).populate("referredBy"); // Find user by ID and populate referredBy
  if (!user.referredBy)
    return res.status(404).json({ message: "No parent referral found." }); // Return error if no parent referral found

  const parent = user.referredBy; // Get parent user
  const grandparent = parent.referredBy
    ? await User.findById(parent.referredBy)
    : null; // Get grandparent user if exists

  res.status(200).json({
    parent: {
      username: parent.username, // Return parent username
      referralCode: parent.referralCode, // Return parent referral code
    },
    grandparent: grandparent
      ? {
          username: grandparent.username, // Return grandparent username if exists
          referralCode: grandparent.referralCode, // Return grandparent referral code if exists
        }
      : null,
  });
};

// Get children and grandchildren function
const getChildren = async (req, res) => {
  const user = await User.findById(req.user._id).populate("referrals"); // Find user by ID and populate referrals
  const children = user.referrals; // Get children

  const grandchildren = await User.find({
    referredBy: { $in: children.map((child) => child._id) },
  }); // Find grandchildren

  res.status(200).json({
    children: children.map((child) => ({
      username: child.username, // Return child username
      referralCode: child.referralCode, // Return child referral code
    })),
    grandchildren: grandchildren.map((grandchild) => ({
      username: grandchild.username, // Return grandchild username
      referralCode: grandchild.referralCode, // Return grandchild referral code
    })),
  });
};

export { signup, login, getUserDetails, getParent, getChildren }; // Export functions

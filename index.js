import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";

import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 6000;

app.use(express.json());
app.use(cookieParser());

mongoose.connect(
  process.env.MONGO_URI,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  () => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  }
);

app.get("/api/hello", (req, res) => res.send("Hello from Refer-Earn!"));

app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionRoutes);

import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import helmet from "helmet";
import mongoose from "mongoose";

//import morganMiddleware from "./middlewares/morganMiddleware.js";
import * as errorHandler from "./middlewares/apiErrorHandler.js";
import langchainRoutes from "./routes/langchain.routes.js";
import meetingRoutes from "./routes/meetings.routes.js";
import { userRoutes } from "./routes/user.routes.js";

dotenv.config();

mongoose
  .connect(process.env.MONGODB_ATLAS_URI)
  .then(() => {
    console.log("MongoDB Connection established");
  })
  .catch(() => {
    console.log("Error in connecting mongodb");
  });

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(helmet());
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH"
  );
  next();
});

const port = process.env.PORT || 8080;

//app.use(morganMiddleware);
app.use("/api/langchain", langchainRoutes);
app.use("/api/meeting", meetingRoutes);
app.use("/api/users", userRoutes);

// Error Handler
app.use(errorHandler.notFoundErrorHandler);
app.use(errorHandler.errorHandler);

app.listen(port, function () {
  console.log(`Sales application listening on port ${port}!`);
});

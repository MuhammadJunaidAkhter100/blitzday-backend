import * as express from "express";
import multer from 'multer';

import asyncHandler from "../utils/asyncHandler.js";
import langChainController from "../controllers/langchain.controller.js";
import isAuthenticated from "../middlewares/jwt.js";

export const langChainRouter = express.Router();
const router = langChainRouter;
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/")
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname)
  },
})
const uploadStorage = multer({ storage: storage })

router.get(
  `/getQuestionsFromPhrase/:phrase`,
  isAuthenticated,
  asyncHandler(langChainController.getQuestionsFromPhrase)
);

router.get(
  `/getOpenAIResponse/:question`,
  isAuthenticated,
  asyncHandler(langChainController.getOpenAIResponse)
);
router.get(
  `/getAllDocuments`,
  isAuthenticated,
  asyncHandler(langChainController.getAllDocuments)
);
router.post(
  `/uploadeSinglePdfToVectorDb`,
  isAuthenticated,
  uploadStorage.single("file"),
  asyncHandler(langChainController.uploadeSinglePdfToVectorDb)
);
router.post(
  `/deleteDocument`,
  isAuthenticated,
  asyncHandler(langChainController.deleteDocument)
);
router.post(
  `/uploadeMultiplePdfsToVectorDb`,
  uploadStorage.array("file", 10),
  asyncHandler(langChainController.uploadeMultiplePdfsToVectorDb)
);

export default router;

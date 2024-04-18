//import Logger from "../config/logger.js";
import { documentsModel } from "../models/documents.model.js";
import { Types } from "mongoose";

const insertSingleDocument = async (name, type, email) => {
  //Logger.info("DocumentController:insertSingleDocument(): - start");

  const document = await documentsModel.create({
    name: name,
    type: type,
    userEmail: email
  });

  //Logger.info("DocumentController:insertSingleDocument(): - end");
  return document;
};

const getAllDocuments = async (email) => {
  //Logger.info("DocumentController:getAllDocuments(): - start");

  const documents = await documentsModel.find({ userEmail: email });

  //Logger.info("DocumentController:getAllDocuments(): - end");
  return documents;
};

const deleteDocument = async (id) => {
  await documentsModel.deleteOne({ _id: new Types.ObjectId(id) });
};


export default {
  insertSingleDocument,
  getAllDocuments,
  deleteDocument
};

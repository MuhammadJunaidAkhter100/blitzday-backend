import httpStatusCodes from "http-status-codes";
import ApiResponse from "../utils/ApiResponse.js";
//import Logger from "../config/logger.js";
import fs from "fs";

import { ChatOpenAI } from "@langchain/openai";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MongoDBAtlasVectorSearch } from "@langchain/community/vectorstores/mongodb_atlas";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";

import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { PPTXLoader } from "langchain/document_loaders/fs/pptx";
import { DocxLoader } from "langchain/document_loaders/fs/docx";

import { CharacterTextSplitter } from "langchain/text_splitter";

import { getMongoVectorStoredCollection } from "../utils/methods.js";
import { ApiError } from "../utils/ApiError.js";
import documentsController from "./documents.controller.js";

import { userModel } from "../models/user.model.js";

const splitter = new CharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 150,
});

const getOpenAIResponse = async (req, res) => {
  //Logger.info("LangChainController:getOpenAIResponse(): - start");

  let { question } = req.params;
  if (!question) {
    throw new ApiError(
      httpStatusCodes.UNPROCESSABLE_ENTITY,
      "question is required",
      httpStatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  const user = await userModel.findOne({ email: req.email });

  if (user.role === 'teamMember') {
    req.email = user.ownerCompanyEmail;
  }

  const embeddings = new OpenAIEmbeddings();
  const { collection, client } = getMongoVectorStoredCollection();
  const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
    collection,
    indexName: 'vector_index'
  });

  const vectorStoreRetriever = vectorStore.asRetriever({
    searchType: "mmr",
    searchKwargs: {
      fetchK: 20,
      lambda: 0.1
    },
    filter: { postFilterPipeline: [{ $match: { email: req.email } }] }
  });

  //question = question.replace(/\b(you|your|yours)\b/gi, user.companyName);
  const relevantDocuments = await vectorStoreRetriever.getRelevantDocuments(question);

  let answer = '-';
  if (relevantDocuments?.length > 0) {
    const outputParser = new StringOutputParser();

    const SYSTEM_TEMPLATE = `As an AI assistant you provide answers based on the given context, ensuring accuracy and brifness. 

          You always follow these guidelines:

          -Answer should be in html markup unordered list, Each sentence as a single list item
          -Words in list item sentences should have spaces between them
          -If the answer isn't available within the context, reply with "-"
          -Otherwise, answer to your best capability, refering to source of documents provided
          -Only use examples if explicitly requested
          -Do not introduce examples outside of the context
          -Do not answer if context is absent
          -Do not include links
          -Limit responses to three or four sentences for clarity and conciseness
          ------------
          {context}
    `

    const messages = [
      SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
      HumanMessagePromptTemplate.fromTemplate("{question}"),
    ];
    const prompt = ChatPromptTemplate.fromMessages(messages);

    const chatModel = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY
    });

    const llmChain = RunnableSequence.from([
      {
        context: vectorStoreRetriever.pipe(formatDocumentsAsString),
        question: new RunnablePassthrough(),
      },
      prompt,
      chatModel,
      outputParser,
    ]);

    answer = await llmChain.invoke(question);
    await client.close();
  }

  ApiResponse.result(res, { answer }, httpStatusCodes.OK);

  //Logger.info("LangChainController:getOpenAIResponse(): - end");
};

const uploadeSinglePdfToVectorDb = async (req, res) => {
  //Logger.info("LangChainController:uploadeSinglePdfToVectorDb(): - start");

  if (!req.file) {
    throw new ApiError(
      httpStatusCodes.UNPROCESSABLE_ENTITY,
      "No file attached",
      httpStatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  const document = await documentsController.insertSingleDocument(
    req.file.originalname,
    req.file.mimetype,
    req.email
  );

  const filePath = `./uploads/${req.file.filename}`;
  let loader;

  switch (req.file.mimetype) {
    case 'application/pdf':
      loader = new PDFLoader(filePath)
      break;
    case 'text/plain':
      loader = new TextLoader(filePath)
      break;
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      loader = new DocxLoader(filePath)
      break;
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      loader = new PPTXLoader(filePath)
      break;
  }

  const docs = await loader.load();

  const documents = await splitter.splitDocuments(docs);
  const embeddings = new OpenAIEmbeddings();
  const { collection, client } = getMongoVectorStoredCollection();

  if (documents?.length > 0) {
    documents?.map((item) => {
      item.metadata.documentId = document.id;
      item.metadata.email = req.email;
    });
  }

  await MongoDBAtlasVectorSearch.fromDocuments(documents, embeddings, {
    collection,
  });

  fs.unlink(filePath, () => { });
  await client.close();
  ApiResponse.result(res, { status: "uploaded" }, httpStatusCodes.OK);

  //Logger.info("LangChainController:uploadeSinglePdfToVectorDb(): - end");
};

const uploadeMultiplePdfsToVectorDb = async (req, res) => {
  //Logger.info("LangChainController:uploadeMultiplePdfsToVectorDb(): - start");

  if (!req.files) {
    throw new ApiError(
      httpStatusCodes.UNPROCESSABLE_ENTITY,
      "No Pdf file attached",
      httpStatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  let loadedDocuments = [];
  for (let file of req.files) {
    const filePath = `./uploads/${file.filename}`;
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();
    loadedDocuments = [...loadedDocuments, ...docs];
  }

  const documents = await splitter.splitDocuments(loadedDocuments);
  const embeddings = new OpenAIEmbeddings();
  const { collection, client } = getMongoVectorStoredCollection();

  await MongoDBAtlasVectorSearch.fromDocuments(documents, embeddings, {
    collection,
  });

  req.files.forEach((file) => {
    const filePath = `./uploads/${file.filename}`;
    fs.unlink(filePath, () => { });
  });

  await client.close();
  ApiResponse.result(res, { status: "uploaded" }, httpStatusCodes.OK);

  //Logger.info("LangChainController:uploadeMultiplePdfsToVectorDb(): - end");
};

const getAllDocuments = async (req, res) => {
  //Logger.info("LangChainController:getAllDocuments(): - start");

  const documents = await documentsController.getAllDocuments(req.email);

  ApiResponse.result(res, { documents }, httpStatusCodes.OK);

  //Logger.info("LangChainController:getAllDocuments(): - end");
};

const deleteDocument = async (req, res) => {
  const { documentId } = req.body;

  if (!documentId) {
    throw new ApiError(
      httpStatusCodes.UNPROCESSABLE_ENTITY,
      "Document Id is required",
      httpStatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  await documentsController.deleteDocument(documentId);

  const { collection, client } = getMongoVectorStoredCollection();
  await collection.deleteMany({ documentId })

  await client.close();
  ApiResponse.result(res, { isDeleted: true }, httpStatusCodes.OK);
};

const getQuestionsFromPhrase = async (req, res) => {

  const { phrase } = req.params;
  if (!phrase) {
    throw new ApiError(
      httpStatusCodes.UNPROCESSABLE_ENTITY,
      "phrase is required",
      httpStatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  const chatModel = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY
  });

  const answer = await chatModel.invoke(`Task: Add punctuation in following Raw Text

    ${phrase}
  `);

  ApiResponse.result(res, { answer: answer.content }, httpStatusCodes.OK);
};

export default {
  getOpenAIResponse,
  uploadeSinglePdfToVectorDb,
  uploadeMultiplePdfsToVectorDb,
  getAllDocuments,
  deleteDocument,
  getQuestionsFromPhrase
};

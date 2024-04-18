import * as mongoose from 'mongoose';

const documentsSchema = new mongoose.Schema(
  {
    userEmail: {
      // user email
      type: String,
      required: true,
    },
    name: {
      // document name
      type: String,
      required: true,
    },
    type: {
      // document type
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

const documentsModel = mongoose.model('Documents', documentsSchema, 'documents');

export { documentsModel };

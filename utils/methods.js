import { MongoClient } from "mongodb";


export const getMongoVectorStoredCollection = () => {
  const client = new MongoClient(process.env.MONGODB_ATLAS_URI || "");
  const namespace = `${process.env.DB}.${process.env.COLLECTION}`;
  const [dbName, collectionName] = namespace.split(".");
  return {
    collection: client.db(dbName).collection(collectionName),
    client
  }
};

export const generateStrongPassword = () => {
  const length = 8;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_";

  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset.charAt(randomIndex);
  }

  return password;
}

export const generateRandomToken = (length) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    token += characters.charAt(randomIndex);
  }

  return token;
}

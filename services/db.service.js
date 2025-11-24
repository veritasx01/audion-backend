import { MongoClient } from 'mongodb';

import { config } from '../config/db/index.js';
// console.log('config:', config)

export const dbService = { getCollection };

var dbConn = null;

async function getCollection(collectionName) {
  try {
    const db = await _connect();
    const collection = await db.collection(collectionName);
    return collection;
  } catch (err) {
    console.log('Failed to get Mongo collection', err);
    throw err;
  }
}

async function _connect() {
  if (dbConn) return dbConn;

  try {
    const client = await MongoClient.connect(config.dbURL);
    return (dbConn = client.db(config.dbName));
  } catch (err) {
    console.log('Cannot Connect to DB', err);
    throw err;
  }
}

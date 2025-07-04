// db.mjs
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

// Setup file adapter and default schema
const adapter = new JSONFile('db.json');
const defaultData = { users: [], slots: [] };

// Initialize and load database
const db = new Low(adapter, defaultData);
await db.read();
db.data ||= defaultData;
await db.write();

export default db;

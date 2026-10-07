#!/bin/bash
set -e
mongosh --quiet --eval '
const admin = db.getSiblingDB("admin");
admin.auth(process.env.MONGO_INITDB_ROOT_USERNAME, process.env.MONGO_INITDB_ROOT_PASSWORD);
const database = db.getSiblingDB(process.env.MONGO_DATABASE_NAME);
if (!database.getUser(process.env.MONGO_DATABASE_USERNAME)) {
  database.createUser({
    user: process.env.MONGO_DATABASE_USERNAME,
    pwd: process.env.MONGO_DATABASE_PASSWORD,
    roles: [{ role: "dbOwner", db: process.env.MONGO_DATABASE_NAME }]
  });
}
'

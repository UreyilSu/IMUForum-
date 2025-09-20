#!/bin/bash

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "Starting MongoDB..."
    # Start MongoDB (adjust path if needed)
    mongod --dbpath ~/mongodb-data &
    sleep 3
fi

echo "Starting IMUForum..."
node index.js


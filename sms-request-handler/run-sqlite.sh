#!/bin/bash

# Remove any old database file
rm -f textchain.db

# Unset any old DATABASE_URL
unset DATABASE_URL

# Set SQLite database
export DATABASE_URL="sqlite:textchain.db"

echo "Starting TextChain with SQLite database..."
echo "Database file: textchain.db"
echo ""

cargo run

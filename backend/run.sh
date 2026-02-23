#!/bin/bash
echo "Starting MyFit Standalone Java Server..."
cd "$(dirname "$0")"
mkdir -p data
# Run the single-file Java source directly (supported in Java 11+)
java MyFitServer.java

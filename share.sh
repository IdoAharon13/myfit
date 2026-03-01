#!/bin/bash

echo "=========================================================="
echo "🚀 Creating Secure Public Link for myfit"
echo "=========================================================="
echo "Please wait while we generate a secure HTTPS URL..."
echo "You can open the generated URL on your phone or any other computer."
echo "(Press Ctrl+C to stop sharing)"
echo "----------------------------------------------------------"

# Use localhost.run to create an instant SSH tunnel to port 8080
ssh -R 80:localhost:8080 nokey@localhost.run -T -o StrictHostKeyChecking=no


#!/bin/bash
# Script to check if Docker services are running and accessible
# Run this on your EC2 instance: bash check-services.sh

echo "=== Checking Docker Containers ==="
docker ps

echo -e "\n=== Checking if containers are listening on ports ==="
echo "Frontend (port 3000):"
curl -I http://localhost:3000 2>&1 | head -1 || echo "Frontend not accessible on port 3000"

echo -e "\nBackend (port 8000):"
curl -I http://localhost:8000/api 2>&1 | head -1 || echo "Backend not accessible on port 8000"

echo -e "\n=== Checking Nginx status ==="
sudo systemctl status nginx --no-pager | head -5

echo -e "\n=== Testing Nginx connection to containers ==="
echo "Testing frontend connection:"
curl -I http://127.0.0.1:3000 2>&1 | head -1 || echo "Cannot connect to frontend from host"

echo -e "\nTesting backend connection:"
curl -I http://127.0.0.1:8000/api 2>&1 | head -1 || echo "Cannot connect to backend from host"

echo -e "\n=== Docker Compose Status ==="
docker compose ps

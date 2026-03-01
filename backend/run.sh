#!/bin/bash
# MyFit Spring Boot Server Runner

echo "========================================"
echo "STARTING MYFIT SPRING BOOT SERVER..."
echo "========================================"

# Making sure mvnw is executable
chmod +x ./mvnw

# Running the Spring Boot application
./mvnw spring-boot:run

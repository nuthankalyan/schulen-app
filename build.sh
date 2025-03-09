#!/bin/bash

# Install dependencies with legacy peer deps flag
npm install --legacy-peer-deps

# Ensure Font Awesome packages are installed
npm install --save @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons @fortawesome/react-fontawesome

# Build the application
npm run build 
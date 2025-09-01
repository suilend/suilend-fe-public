#!/bin/bash

echo "Checking if frontend has changed..."

# If frontend has changes in the last commit range, proceed with build
if git diff --quiet HEAD^ HEAD -- . ../sdk/ ../.gitignore ../bun.lock ../eslint.config.js ../package.json ../README.md; then
  echo "No changes in frontend/. Skipping build."
  exit 0
else
  echo "Changes detected in frontend/. Proceeding with build."
  exit 1
fi
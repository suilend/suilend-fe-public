#!/bin/bash

echo "Checking if send has changed..."

# If send has changes in the last commit range, proceed with build
if git diff --quiet HEAD^ HEAD -- .; then
  echo "No changes in send/. Skipping build."
  exit 0
else
  echo "Changes detected in send/. Proceeding with build."
  exit 1
fi
#!/bin/bash

echo "Checking if send has changed..."

# If send has changes in the last commit range, proceed with build
if git diff --quiet HEAD^ HEAD -- .; then
  echo "No changes in send/. Skipping build."
  exit 0

elif [[ "$VERCEL_ENV" == "beta" || "$VERCEL_ENV" == "production" || "$VERCEL_ENV" == "playground" ]] ; then
# Proceed with the build
  echo "✅ - Build can proceed"
exit 1;
else
  # Don't build
  echo "🛑 - Build cancelled"
  exit 0;
fi
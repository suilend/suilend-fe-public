#!/bin/bash

# Check if send/ has changes in the last commit range
if git diff --quiet HEAD^ HEAD -- .; then
  # Skip build
  echo "🛑 - No changes in send/ - skipping build"
  exit 0
else
  # Check if environment is production, beta, or playground
  if [[ "$VERCEL_ENV" == "production" || "$VERCEL_ENV" == "beta" || "$VERCEL_ENV" == "playground" ]] ; then
    # Proceed with build
    echo "🎉 - Changes detected in send/, and environment is production, beta, or playground - proceeding with build"
    exit 1;
  else
    # Skip build
    echo "🛑 - Environment is not production, beta, or playground - skipping build"
    exit 0;
  fi
fi


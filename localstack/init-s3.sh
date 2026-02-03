#!/usr/bin/env bash
set -euo pipefail

BUCKET_NAME="golfapp-local"

awslocal s3 mb "s3://${BUCKET_NAME}" || true
awslocal s3api put-bucket-cors --bucket "${BUCKET_NAME}" --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:5173"],
      "AllowedMethods": ["GET", "PUT", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}' || true

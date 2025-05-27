#!/bin/bash
# deploy-backend.sh - Deploy full backend API including Monday.com integration

# Colors for messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Function to display messages
print_message() {
  echo -e "${2}${1}${NC}"
}

# Parameters
REGION="us-east-1"
ENVIRONMENT="dev"
BUILD_DIR="./build"
LAMBDA_NAME="${ENVIRONMENT}-backend-api"
API_ID="f15rf7qk0g"  # Your existing API Gateway ID
MONDAY_API_KEY="eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjM5Njg0MzYxNywiYWFpIjoxMSwidWlkIjoyODU5NDIyNiwiaWFkIjoiMjAyNC0wOC0xNFQwMDoyODo0MC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6NTAxOTQ4MSwicmduIjoidXNlMSJ9.Ei0Eo7mGkNVUJSdEgXj0jMbgLbQ1kneKoHmN3QRZ454"
JWT_SECRET="kpi-dashboard-secret-key"

print_message "Starting deployment of full backend API..." "$GREEN"

# Create build directory
mkdir -p $BUILD_DIR

# Create Lambda package directory
mkdir -p lambda-package
cd lambda-package

# Create package.json with all required dependencies
cat > package.json << 'EOL'
{
  "name": "backend-api",
  "version": "1.0.0",
  "description": "Full Backend API for KPI Dashboard",
  "main": "index.js",
  "dependencies": {
    "express": "^4.17.1",
    "body-parser": "^1.19.0",
    "cors": "^2.8.5",
    "serverless-http": "^2.7.0",
    "axios": "^0.21.1",
    "jsonwebtoken": "^8.5.1",
    "multer": "^1.4.5-lts.1",
    "aws-sdk": "^2.1048.0",
    "dotenv": "^10.0.0",
    "fs": "0.0.1-security",
    "path": "^0.12.7"
  }
}
EOL

# Install dependencies
print_message "Installing dependencies..." "$YELLOW"
npm install --production

# First, fix the path to your backend directory
# Check where your backend directory is located relative to the script
print_message "Checking backend directory location..." "$YELLOW"
if [ -d "../backend" ]; then
  BACKEND_PATH="../backend"
elif [ -d "./backend" ]; then
  BACKEND_PATH="./backend"
elif [ -d "../../backend" ]; then
  BACKEND_PATH="../../backend"
else
  print_message "Cannot find backend directory. Please specify the correct path." "$RED"
  exit 1
fi

print_message "Found backend directory at: $BACKEND_PATH" "$GREEN"

# Copy the entire backend directory structure
print_message "Copying backend files..." "$YELLOW"
cp -r $BACKEND_PATH/* .

# Create the main Lambda handler (index.js) that wraps your server.js
cat > index.js << 'EOL'
const serverless = require('serverless-http');
const express = require('express');
const app = require('./server');

// Export the serverless handler
module.exports.handler = serverless(app);
EOL


# Create ZIP file
print_message "Creating deployment package..." "$YELLOW"
zip -r ../$BUILD_DIR/backend-api.zip .

# Go back to scripts directory
cd ..

# Create S3 bucket for CSV uploads if it doesn't exist
S3_BUCKET="kpi-dashboard-uploads-${ENVIRONMENT}"
print_message "Creating S3 bucket for CSV uploads if it doesn't exist..." "$YELLOW"
if ! aws s3api head-bucket --bucket $S3_BUCKET --region $REGION 2>/dev/null; then
  print_message "Creating S3 bucket: $S3_BUCKET" "$YELLOW"
  aws s3api create-bucket \
    --bucket $S3_BUCKET \
    --region $REGION \
    --create-bucket-configuration LocationConstraint=$REGION
  
  # Set CORS policy for the bucket
  aws s3api put-bucket-cors \
    --bucket $S3_BUCKET \
    --cors-configuration '{
      "CORSRules": [
        {
          "AllowedHeaders": ["*"],
          "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
          "AllowedOrigins": ["*"],
          "ExposeHeaders": ["ETag"]
        }
      ]
    }'
else
  print_message "S3 bucket $S3_BUCKET already exists" "$GREEN"
fi

# Create DynamoDB tables if they don't exist
print_message "Creating DynamoDB tables if they don't exist..." "$YELLOW"
KPI_TABLE="kpi-data-${ENVIRONMENT}"
COMMENTS_TABLE="kpi-comments-${ENVIRONMENT}"

# Create KPI table
if ! aws dynamodb describe-table --table-name $KPI_TABLE --region $REGION &>/dev/null; then
  print_message "Creating DynamoDB table: $KPI_TABLE" "$YELLOW"
  aws dynamodb create-table \
    --table-name $KPI_TABLE \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region $REGION
else
  print_message "DynamoDB table $KPI_TABLE already exists" "$GREEN"
fi

# Create Comments table
if ! aws dynamodb describe-table --table-name $COMMENTS_TABLE --region $REGION &>/dev/null; then
  print_message "Creating DynamoDB table: $COMMENTS_TABLE" "$YELLOW"
  aws dynamodb create-table \
    --table-name $COMMENTS_TABLE \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region $REGION
else
  print_message "DynamoDB table $COMMENTS_TABLE already exists" "$GREEN"
fi

# Create IAM role for Lambda if it doesn't exist
ROLE_NAME="lambda-backend-api-role"
print_message "Checking if IAM role exists..." "$YELLOW"

if ! aws iam get-role --role-name $ROLE_NAME &>/dev/null; then
  print_message "Creating IAM role: $ROLE_NAME" "$YELLOW"
  
  # Create trust policy document
  cat > trust-policy.json << 'EOL'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOL

  # Create the role with trust policy
  aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file://trust-policy.json

  # Attach basic Lambda execution policy
  aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    
  # Attach S3 access policy
  aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
    
  # Attach DynamoDB access policy
  aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
    
  # Wait for role to propagate
  print_message "Waiting for IAM role to propagate..." "$YELLOW"
  sleep 10
else
  print_message "IAM role $ROLE_NAME already exists" "$GREEN"
fi

# Get the role ARN
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)

# Deploy Lambda function
print_message "Deploying Lambda function..." "$YELLOW"

# Check if function exists
if aws lambda get-function --function-name $LAMBDA_NAME --region $REGION &>/dev/null; then
  # Update existing function
  print_message "Updating existing Lambda function..." "$YELLOW"
  aws lambda update-function-code \
    --function-name $LAMBDA_NAME \
    --zip-file fileb://$BUILD_DIR/backend-api.zip \
    --region $REGION
  
  # Update environment variables
  aws lambda update-function-configuration \
    --function-name $LAMBDA_NAME \
    --environment "Variables={MONDAY_API_KEY=$MONDAY_API_KEY,JWT_SECRET=$JWT_SECRET,S3_BUCKET=$S3_BUCKET,KPI_TABLE=$KPI_TABLE,COMMENTS_TABLE=$COMMENTS_TABLE}" \
    --region $REGION
else
  # Create new function
  print_message "Creating new Lambda function..." "$YELLOW"
  aws lambda create-function \
    --function-name $LAMBDA_NAME \
    --runtime nodejs18.x \
    --handler index.handler \
    --role "$ROLE_ARN" \
    --zip-file fileb://$BUILD_DIR/backend-api.zip \
    --timeout 30 \
    --memory-size 512 \
    --environment "Variables={MONDAY_API_KEY=$MONDAY_API_KEY,JWT_SECRET=$JWT_SECRET,S3_BUCKET=$S3_BUCKET,KPI_TABLE=$KPI_TABLE,COMMENTS_TABLE=$COMMENTS_TABLE}" \
    --region $REGION
fi

# Deploy API
print_message "Deploying API..." "$YELLOW"
DEPLOYMENT_ID=$(aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name $ENVIRONMENT \
  --region $REGION \
  --query 'id' \
  --output text)

print_message "API Gateway deployed with ID: $DEPLOYMENT_ID" "$GREEN"
API_URL="https://$API_ID.execute-api.$REGION.amazonaws.com/$ENVIRONMENT"
print_message "API Endpoint: $API_URL" "$GREEN"

# Update frontend .env with API URL and Monday API key
print_message "Updating frontend .env with API URL..." "$YELLOW"
cd ../frontend
echo "REACT_APP_API_URL=$API_URL" > .env
echo "SKIP_PREFLIGHT_CHECK=true" >> .env
echo "MONDAY_API_KEY=$MONDAY_API_KEY" >> .env
cd - > /dev/null

# Clean up
rm -rf lambda-package

print_message "Full backend API deployment completed successfully!" "$GREEN"
print_message "Example endpoints:" "$GREEN"
print_message "- Authentication: $API_URL/auth/login" "$GREEN"
print_message "- CSV Upload: $API_URL/csv/upload" "$GREEN"
print_message "- KPI Data: $API_URL/api/kpi/data" "$GREEN"
print_message "- Monday.com Integration: $API_URL/api/monday/boards" "$GREEN"

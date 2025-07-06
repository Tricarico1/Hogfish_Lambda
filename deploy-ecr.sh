#!/bin/bash

# AWS Lambda ECR Deployment Script for Hogfish Weather Data Lambda
# This script builds and deploys the Lambda function as a Docker container to ECR

set -e

echo "🚀 Starting ECR deployment of Hogfish Weather Data Lambda..."

# Set environment variables
export AWS_ACCOUNT_ID=805358684705
export AWS_REGION=us-east-1

# Configuration
REPOSITORY_NAME="hogfish-boating-conditions"
IMAGE_NAME="hogfish-boating-conditions"
FUNCTION_NAME="Hogfish-api"

# Verify environment variables are set
if [ -z "$AWS_ACCOUNT_ID" ] || [ -z "$AWS_REGION" ]; then
    echo "❌ Please set AWS_ACCOUNT_ID and AWS_REGION environment variables"
    echo "Example:"
    echo "export AWS_ACCOUNT_ID=805358684705"
    echo "export AWS_REGION=us-east-1"
    exit 1
fi

echo "📋 Using configuration:"
echo "  Repository: $REPOSITORY_NAME"
echo "  Function Name: $FUNCTION_NAME"
echo "  AWS Account ID: $AWS_ACCOUNT_ID"
echo "  AWS Region: $AWS_REGION"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating template..."
    cat > .env << EOF
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
MARINE_API_KEY=your_marine_api_key
WEATHER_API_KEY=your_weather_api_key
EOF
    echo "📝 Please update .env file with your actual credentials before proceeding"
    echo "Press Enter to continue once you've updated .env, or Ctrl+C to exit"
    read -r
fi

# Create ECR repository if it doesn't exist
echo "🏗️  Creating ECR repository (if it doesn't exist)..."
aws ecr create-repository --repository-name $REPOSITORY_NAME --region $AWS_REGION || echo "Repository already exists"

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build Docker image for correct architecture (x86_64/amd64)
echo "🔨 Building Docker image for linux/amd64 (AWS Lambda compatible)..."
docker buildx build --platform linux/amd64 -t $IMAGE_NAME . --load

# Tag image for ECR
echo "🏷️  Tagging image for ECR..."
docker tag $IMAGE_NAME:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME:latest

# Push to ECR
echo "📤 Pushing image to ECR..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME:latest

echo ""
echo "🎉 Docker image successfully deployed to ECR!"
echo ""
echo "🔄 Updating Lambda function with new image..."

# Update Lambda function with new image
aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --image-uri $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME:latest

if [ $? -eq 0 ]; then
    echo "✅ Lambda function updated successfully!"
    echo ""
    echo "🧪 Testing Lambda function..."
    
    # Test the Lambda function
    aws lambda invoke \
      --function-name $FUNCTION_NAME \
      --payload '{}' \
      --cli-binary-format raw-in-base64-out \
      response.json
    
    if [ $? -eq 0 ]; then
        echo "📊 Lambda test results:"
        cat response.json | jq '.'
        rm response.json
    else
        echo "⚠️  Test invocation failed, but function was updated successfully"
    fi
else
    echo "❌ Failed to update Lambda function. You may need to update it manually in the AWS Console."
    echo "💡 Manual update command:"
    echo "aws lambda update-function-code --function-name $FUNCTION_NAME --image-uri $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME:latest"
fi

echo ""
echo "📋 Deployment complete! Your weather/snorkeling data Lambda is now running the latest code."
echo ""
echo "🔗 Image URI: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME:latest"
echo "🌊 Processing: 109 weather locations + 30 snorkeling spots"
echo "📊 Database tables: weather_forecast + snorkeling_spots" 
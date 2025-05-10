// This script can be used to test the Lambda function locally
// Run with: node test-locally.js

// Importing the Lambda handler
const { handler } = require('./index');

// Simulate Lambda event (this can be empty as we don't use event properties)
const event = {};

// Call the handler and log the result
async function testLambda() {
  try {
    console.log('Starting local test of Lambda function...');
    const result = await handler(event);
    console.log('Lambda execution result:', result);
  } catch (error) {
    console.error('Error executing Lambda locally:', error);
  }
}

// Run the test
testLambda(); 
const { test, expect } = require('@playwright/test');
// For Node.js v17.5 or higher (where fetch is native)
const fetch = globalThis.fetch;  // Use global fetch
const fs = require('fs');
const path = require('path');

// Utility function to fetch emails from Mailpit
async function getMailpitEmailCode(email) {
  const apiUrl = 'http://127.0.0.1:8025/api/v1/messages'; // Mailpit API URL
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    params: { to: email }
  });

  const data = await response.json();
  if (data.length === 0) {
    throw new Error('No emails found for the provided address');
  }

  console.log(data);
  const verificationEmail = data?.messages[0]; // Assuming the latest email
  const verificationCodeMatch = verificationEmail?.Snippet?.match(/\d{6}/); // Assuming the code is a 6-digit number
  if (verificationCodeMatch) {
    return verificationCodeMatch[0];
  }
  throw new Error('No verification code found in the email');
}

// Utility function to check if email exists in registered_emails.txt
function isEmailRegistered(email) {
  const filePath = path.join(__dirname, '../../../src/registered_emails.txt');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return fileContent.includes(email);
}

let passedTests = 0;
let failedTests = 0;

test('should register email and verify code', async ({ page }) => {
  const email = 'testuser@example.com';

  // Step 1: Submit the email in the form
  // Clear Mailpit before test
  await fetch('http://127.0.0.1:8025/api/v1/messages', { method: 'DELETE' });

  try {
    // Continue with original steps
    await page.goto('http://127.0.0.1:8000/index.php');
    await page.fill('input[name="email"]', email);
    await page.click('#submit-email');

    // Step 2: Retrieve the verification code from Mailpit
    const verificationCode = await getMailpitEmailCode(email);
    console.log(`Verification Code: ${verificationCode}`);

    // Step 3: Enter the verification code and submit
    await page.fill('input[name="verification_code"]', verificationCode);
    await page.click('#submit-verification');

    // Step 4: Verify if the email is in registered_emails.txt
    const isRegistered = isEmailRegistered(email);
    expect(isRegistered).toBe(true); // Ensure email is registered
    passedTests++;
  } catch (error) {
    console.error('Test failed:', error);
    failedTests++;
  } finally {
    // Log total and passed cases after each test
    console.log(`Total tests: ${passedTests + failedTests}`);
    console.log(`Passed: ${passedTests}, Failed: ${failedTests}`);
  }
});

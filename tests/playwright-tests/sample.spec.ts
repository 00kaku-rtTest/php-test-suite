const { test, expect } = require('@playwright/test');
// For Node.js v17.5 or higher (where fetch is native)
const fetch = globalThis.fetch;  // Use global fetch
const fs = require('fs');
const path = require('path');

// Utility function to fetch emails from Mailpit
async function getMailpitEmailCode(email, maxRetries = 5, delayMs = 2000) {
	const apiUrl = 'http://localhost:8025/api/v1/messages'; // Mailpit API URL

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
	  console.log(`Attempt ${attempt} to fetch email...`);
	  const response = await fetch(apiUrl, {
		method: 'GET',
		headers: { 'Accept': 'application/json' }
	  });

	  const data = await response.json();

	  if (data.messages && data.messages.length > 0) {
		const latestEmail = data.messages.find(msg => msg.To[0].Address === email);
		if (latestEmail) {
		  console.log(`Email found on attempt ${attempt}:`, latestEmail);

		  const verificationCodeMatch = latestEmail.Snippet.match(/\d{6}/); // Match 6-digit code
		  if (verificationCodeMatch) {
			return verificationCodeMatch[0]; // Return extracted code
		  }
		}
	  }

	  if (attempt < maxRetries) {
		console.log(`Retrying in ${delayMs / 1000} seconds...`);
		await new Promise(resolve => setTimeout(resolve, delayMs)); // Wait before retrying
	  } else {
		throw new Error('No verification code found in email after multiple attempts');
	  }
	}
}


// Utility function to check if email exists in registered_emails.txt with retries
function isEmailRegistered(email, maxRetries = 5, delayMs = 2000) {
	const filePath = path.join(__dirname, '../../../src/registered_emails.txt');

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
	  console.log(`Attempt ${attempt} to check if email is registered...`);

	  if (fs.existsSync(filePath)) {
		const fileContent = fs.readFileSync(filePath, 'utf-8');
		if (fileContent.includes(email)) {
		  console.log(`Email found on attempt ${attempt}`);
		  return true;
		}
	  }

	  if (attempt < maxRetries) {
		console.log(`Retrying in ${delayMs / 1000} seconds...`);
		Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs); // Wait before retrying
	  } else {
		console.warn(`Email not found after ${maxRetries} attempts.`);
		return false;
	  }
	}
}


let passedTests = 0;
let failedTests = 0;

test('should register email and verify code', async ({ page }) => {
  const email = 'testuser@example.com';

  // Step 1: Submit the email in the form
  // Clear Mailpit before test
//   await fetch('http://localhost:8025/api/v1/messages', { method: 'DELETE' });

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

    await page.waitForTimeout(3000);

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

const { test, expect } = require('@playwright/test');
const fetch = globalThis.fetch;
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:8000';
const MAILPIT_API_URL = 'http://localhost:8025/api/v1/messages';
const CRON_JOB_URL = `${BASE_URL}/cron.php`;
const REGISTERED_EMAILS_PATH = path.join(__dirname, '../../../src/registered_emails.txt');

let passedTests = 0;
let failedTests = 0;

async function deleteAllEmails() {
	console.log("🧹 Deleting all emails from Mailpit...");
	const response = await fetch(MAILPIT_API_URL, { method: 'DELETE' });
	if (response.ok) {
		console.log("✅ Mailpit emails deleted successfully.");
	} else {
		console.error("❌ Failed to delete Mailpit emails.");
	}
}

async function getMailpitEmailCode(email, maxRetries = 5, delayMs = 2000) {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		console.log(`Attempt ${attempt} to fetch email...`);
		const response = await fetch(MAILPIT_API_URL, { method: 'GET', headers: { 'Accept': 'application/json' } });
		const data = await response.json();
		const latestEmail = data.messages?.find(msg => msg.To[0].Address === email);
		if (latestEmail) {
			console.log(`Email found on attempt ${attempt}:`, latestEmail);
			const verificationCodeMatch = latestEmail.Snippet.match(/\d{6}/);
			if (verificationCodeMatch) return verificationCodeMatch[0];
		}
		await new Promise(resolve => setTimeout(resolve, delayMs));
	}
	throw new Error('No verification code found in email after multiple attempts');
}

function isEmailRegistered(email) {
	if (fs.existsSync(REGISTERED_EMAILS_PATH)) {
		const fileContent = fs.readFileSync(REGISTERED_EMAILS_PATH, 'utf-8');
		return fileContent.includes(email);
	}
	return false;
}

function isEmailUnsubscribed(email) {
	if (fs.existsSync(REGISTERED_EMAILS_PATH)) {
		const fileContent = fs.readFileSync(REGISTERED_EMAILS_PATH, 'utf-8');
		return !fileContent.includes(email);
	}
	return true; // If file does not exist, all emails are unsubscribed
}

async function runTest(testName, testFn) {
	try {
		console.log(`\n🟢 Running Test: ${testName}`);
		await testFn();
		console.log(`✅ Test Passed: ${testName}`);
		passedTests++;
	} catch (error) {
		console.error(`❌ Test Failed: ${testName}`, error);
		failedTests++;
	}
}

async function getMailpitEmailWithSubject(email, expectedSubject, maxRetries = 5, delayMs = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`Attempt ${attempt} to fetch email with subject "${expectedSubject}"...`);
        const response = await fetch(MAILPIT_API_URL, { method: 'GET', headers: { 'Accept': 'application/json' } });
        const data = await response.json();

        const targetEmail = data.messages?.find(msg =>
            msg.To[0].Address === email && msg.Subject.includes(expectedSubject)
        );

        if (targetEmail) {
            console.log(`✅ Email found on attempt ${attempt}:`, targetEmail);
            return true;
        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    console.error(`❌ No email with subject "${expectedSubject}" found after multiple attempts.`);
    return false;
}


// 🧹 Delete all emails before each test
test.beforeEach(async () => {
	await deleteAllEmails();
});

test('Email Registration Flow', async ({ page }) => {
	await runTest('Email Registration Flow', async () => {
		const email = 'testuser@example.com';
		await page.goto(`${BASE_URL}/index.php`);
		await page.fill('input[name="email"]', email);
		await page.click('#submit-email');

		const verificationCode = await getMailpitEmailCode(email);
		console.log(`Verification Code: ${verificationCode}`);

		await page.fill('input[name="verification_code"]', verificationCode);
		await page.click('#submit-verification');
		await page.waitForTimeout(5000);

		expect(isEmailRegistered(email)).toBe(true);
	});
});

test('Cron Email Flow', async ({ page }) => {
    await runTest('Cron Email Flow', async () => {
        const email = 'testuser@example.com';

        console.log('Running cron job to send email...');
        await fetch(CRON_JOB_URL, { method: 'GET' });

        // Wait for the email with subject "Latest GitHub Updates"
        const emailReceived = await getMailpitEmailWithSubject(email, "Latest GitHub Updates");

        expect(emailReceived).toBeTruthy();
        console.log("✅ Email with subject 'Latest GitHub Updates' received successfully.");
    });
});


test('Unsubscribe Flow', async ({ page }) => {
	await runTest('Unsubscribe Flow', async () => {
		const email = 'testuser@example.com';
		await page.goto(`${BASE_URL}/index.php?unsubscribe=true`);
		await page.fill('input[name="unsubscribe_email"]', email);
		await page.click('#submit-unsubscribe');

		const unsubscribeCode = await getMailpitEmailCode(email);
		console.log(`Unsubscribe Code: ${unsubscribeCode}`);

		await page.fill('input[name="unsubscribe_verification_code"]', unsubscribeCode);
		await page.click('#verify-unsubscribe');
		await page.waitForTimeout(5000);

		expect(isEmailUnsubscribed(email)).toBe(true);
	});
});

// 📌 Print Summary After All Tests
test.afterAll(async () => {
	console.log(`\n📌 Test Summary:`);
	console.log(`✅ Passed Tests: ${passedTests}`);
	console.log(`❌ Failed Tests: ${failedTests}`);

	if (failedTests > 0) {
		console.warn("\nSome tests failed. Exiting with error status.");
		process.exitCode = 1;
	} else {
		console.log("\nAll tests passed successfully. ✅");
	}
});

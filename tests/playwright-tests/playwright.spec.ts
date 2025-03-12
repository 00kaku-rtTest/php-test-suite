const { test, expect } = require('@playwright/test');
const fetch = globalThis.fetch;
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:8000';
const MAILPIT_API_URL = 'http://localhost:8025/api/v1/messages';
const CRON_JOB_URL = `${BASE_URL}/cron.php`;
let UNSUBSCRIBE_URL = '';
const REGISTERED_EMAILS_PATH = path.join(__dirname, '../../src/registered_emails.txt');

let passedTests = 0;
let failedTests = 0;

async function deleteAllEmails() {
	const response = await fetch(MAILPIT_API_URL, { method: 'DELETE' });
}

async function getMailpitEmailCode(email, maxRetries = 5, delayMs = 2000) {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		const response = await fetch(MAILPIT_API_URL, { method: 'GET', headers: { 'Accept': 'application/json' } });
		const data = await response.json();
		const latestEmail = data.messages?.find(msg => msg.To[0].Address === email);
		if (latestEmail) {
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
		await testFn();
		passedTests++;
	} catch (error) {
		failedTests++;
	}
}

async function getMailpitEmailWithSubject(email, expectedSubject, maxRetries = 5, delayMs = 2000) {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		const response = await fetch(MAILPIT_API_URL, { method: 'GET', headers: { 'Accept': 'application/json' } });
		const data = await response.json();

		const targetEmail = data.messages?.find(msg =>
			msg.To[0].Address === email && msg.Subject.includes(expectedSubject)
		);

		if (targetEmail) {
			const emailDetailsResponse = await fetch(`http://localhost:8025/api/v1/message/${targetEmail.ID}`, { method: 'GET' });
			const emailDetails = await emailDetailsResponse.json();
			const unsubscribeMatch = emailDetails.HTML.match(/<a\s+[^>]*id=["']unsubscribe-button["'][^>]*href=["']([^"']+)["']|<a\s+[^>]*href=["']([^"']+)["'][^>]*id=["']unsubscribe-button["']/);
			if (unsubscribeMatch) {
				UNSUBSCRIBE_URL = unsubscribeMatch[1] || unsubscribeMatch[2];;
			}
			return true;
		}

		await new Promise(resolve => setTimeout(resolve, delayMs));
	}

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

		await page.fill('input[name="verification_code"]', verificationCode);
		await page.click('#submit-verification');
		await page.waitForTimeout(5000);

		expect(isEmailRegistered(email)).toBe(true);
	});
});

test('Cron Email Flow', async ({ page }) => {
	await runTest('Cron Email Flow', async () => {
		const email = 'testuser@example.com';

		await fetch(CRON_JOB_URL, { method: 'GET' });

		// Wait for the email with subject "Latest GitHub Updates"
		const emailReceived = await getMailpitEmailWithSubject(email, "Latest GitHub Updates");

		expect(emailReceived).toBeTruthy();
	});
});


test('Unsubscribe Flow', async ({ page }) => {
	await runTest('Unsubscribe Flow', async () => {
		const email = 'testuser@example.com';
		const finalUrl = UNSUBSCRIBE_URL.startsWith('http') ? UNSUBSCRIBE_URL : `${BASE_URL}/${UNSUBSCRIBE_URL}`;
		await page.goto(finalUrl);
		await page.fill('input[name="unsubscribe_email"]', email);
		await page.click('#submit-unsubscribe');

		const unsubscribeCode = await getMailpitEmailCode(email);

		await page.fill('input[name="unsubscribe_verification_code"]', unsubscribeCode);
		await page.click('#verify-unsubscribe');
		await page.waitForTimeout(5000);

		expect(isEmailUnsubscribed(email)).toBe(true);
	});
});

// 📌 Print Summary After All Tests -- Will be fed to the CG API
test.afterAll(async () => {
	console.log(`\n📌 Test Summary:`);
	console.log(`✅ Passed Tests: ${passedTests}`);
	console.log(`❌ Failed Tests: ${failedTests}`);
});

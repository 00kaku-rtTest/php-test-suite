import { test, expect } from '@playwright/test';

test('Check if PHP server is running', async ({ page }) => {
  await page.goto('http://127.0.0.1:8000');
  await expect(page).toHaveTitle(/Your PHP App Title/);
});

test('Verify Email is received in Mailpit', async ({ page }) => {
  await page.goto('http://localhost:8025'); // Mailpit Web UI
  await page.reload(); // Ensure we get the latest mails
  const emailList = page.locator('.msglist');
  await expect(emailList).toContainText('test@example.com'); // Check if email exists
});

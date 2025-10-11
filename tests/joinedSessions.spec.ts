import { test, expect } from '@playwright/test';

test.describe('Joined Sessions dashboard', () => {
  test('create, join, see joined, re-enter, leave', async ({ page }) => {
    // Create a new session via UI
    await page.goto('/');
    await page.getByRole('link', { name: 'Create New Session' }).click();
    await page.getByLabel('Session Title *').fill('Joined Sessions E2E');
    await page.getByRole('button', { name: 'Create Session' }).click();

    // Capture sessionId from BigScreen URL
    await expect(page).toHaveURL(/#\/screen\//);
    const hash = new URL(page.url()).hash; // #/screen/<uuid>
    const sessionId = hash.split('/').pop();
    expect(sessionId).toBeTruthy();

    // Join as participant
    await page.goto(`/#/join/${sessionId}`);
    // Generate nickname if button present, else type
    const generateBtn = page.getByRole('button', { name: 'Generate' });
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
    } else {
      await page.getByLabel('Your Nickname').fill('DashTester');
    }
    await page.getByRole('button', { name: 'Start Contributing' }).click();

    // Go to Dashboard
    await page.goto('/#/dashboard');

    // Expect Joined Sessions section and our session title present
    await expect(page.getByText('Joined Sessions')).toBeVisible();
    await expect(page.getByText('Joined Sessions E2E')).toBeVisible();

    // Re-enter session
    await page.getByRole('link', { name: 'Re-enter Session' }).first().click();
    await expect(page).toHaveURL(new RegExp(`#\/join\/${sessionId}`));

    // Back to dashboard and leave
    await page.goto('/#/dashboard');
    await page.getByRole('button', { name: 'Leave' }).first().click();

    // Should no longer list that session under Joined Sessions
    await expect(page.getByText('Joined Sessions E2E')).toHaveCount(0);
  });
});


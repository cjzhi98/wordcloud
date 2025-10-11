import { test, expect } from '@playwright/test';

test.describe('Realtime word cloud', () => {
  test.beforeEach(({ baseURL }) => {
    test.skip(!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY, 'Supabase env vars not set');
    test.skip(!baseURL, 'Base URL not configured');
  });

  test('updates Big Screen when participant submits a word', async ({ page, context }) => {
    // Create a new session via UI
    await page.goto('/');
    await page.getByRole('link', { name: 'Create New Session' }).click();
    await page.getByLabel('Session Title *').fill('E2E Test Session');
    await page.getByRole('button', { name: 'Create Session' }).click();

    // Expect redirect to Big Screen with sessionId in URL
    await expect(page).toHaveURL(/#\/screen\//);
    const url = new URL(page.url());
    const hash = url.hash; // e.g. #/screen/uuid
    const sessionId = hash.split('/').pop();
    expect(sessionId).toBeTruthy();

    // Record initial word count (may be 0)
    const wordsBeforeText = await page.locator('text=/\\d+ Words/').first().textContent();
    const wordsBefore = wordsBeforeText ? parseInt(wordsBeforeText.match(/(\d+)/)?.[1] || '0', 10) : 0;

    // Open participant page to join and submit a word
    const participant = await context.newPage();
    await participant.goto(`/#/join/${sessionId}`);

    // Generate nickname and start contributing
    const generateBtn = participant.getByRole('button', { name: 'Generate' });
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
    } else {
      await participant.getByLabel('Your Nickname').fill('Tester');
    }
    await participant.getByRole('button', { name: 'Start Contributing' }).click();

    // Submit a word
    await participant.getByPlaceholder('Type a word or phrase...').fill('playwright');
    await participant.getByRole('button', { name: 'Submit Word' }).click();

    // Expect Big Screen to reflect the new word count eventually
    await expect(page.locator('text=/\\d+ Words/').first()).toHaveText(new RegExp(`${wordsBefore + 1} Words`), { timeout: 15000 });

    // The word cloud should include the submitted term
    await expect(page.locator('text=playwright')).toBeVisible({ timeout: 15000 });
  });
});


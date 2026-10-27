import { test, expect } from '@playwright/test';

for (const concept of ['studio', 'blueprint', 'garden']) {
  test(`${concept}: shared record survives actor handoffs and reload`, async ({ page }) => {
    await page.goto('/#concept=' + concept + '&screen=new-request&role=member');
    await page.getByTestId('request-title').fill('Проверка пути новой записи');
    await page.getByTestId('request-description').fill('Запись должна сохранить результат после работы проверяющего и подтверждения участника.');
    await page.getByTestId('submit-request').click();
    await expect(page.getByTestId('record-status')).toHaveText('Новое');
    await page.reload();
    await expect(page.locator('.page-heading h1')).toHaveText('Проверка пути новой записи');
    await page.getByTestId('role-switch').selectOption('reviewer');
    await page.getByTestId('start-request').click();
    await page.getByTestId('finish-request').click();
    await expect(page.getByTestId('record-status')).toHaveText('Ждёт подтверждения');
    await page.getByTestId('private-note').fill('Private synthetic context');
    await page.locator('.note-panel button[type=submit]').click();
    await page.getByTestId('role-switch').selectOption('member');
    await expect(page.locator('.screen-content')).not.toContainText('Private synthetic context');
    await page.getByTestId('confirm-request').click();
    await page.reload();
    await expect(page.getByTestId('record-status')).toHaveText('Завершено');
  });
  test(`${concept}: mobile menu traps and restores keyboard focus`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#concept=' + concept + '&screen=overview&role=member');
    await page.getByTestId('mobile-menu').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    for (const key of ['Tab', 'Shift+Tab', 'Tab', 'Tab']) {
      await page.keyboard.press(key);
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('mobile-menu')).toBeFocused();
  });
}
test('real offline retains input and blocks false submission', async ({ page, context }) => {
  await page.goto('/#concept=studio&screen=new-request&role=member');
  await page.getByTestId('request-title').fill('Ввод во время отсутствия сети');
  await page.getByTestId('request-description').fill('Поля должны сохраниться до восстановления соединения.');
  await context.setOffline(true);
  await expect(page.getByTestId('submit-request')).toBeDisabled();
  await expect(page.getByTestId('request-title')).toHaveValue('Ввод во время отсутствия сети');
  await page.locator('.feedback button').click();
  await expect(page.getByTestId('submit-request')).toBeDisabled();
  await context.setOffline(false);
  await expect(page.getByTestId('submit-request')).toBeEnabled();
});

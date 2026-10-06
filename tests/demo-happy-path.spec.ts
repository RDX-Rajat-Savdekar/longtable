import fs from 'node:fs'
import { test, expect, ensureStorageState, loadAllTestAccounts, pickTestAccounts } from 'deepspace/testing'

/**
 * Camera take of the happy path. Two signed-in browsers share one table.
 *
 *   DEMO=1 npx playwright test tests/demo-happy-path.spec.ts
 *
 * Needs two accounts from `npx deepspace test accounts create`. The older
 * account has to be the app owner, because only the host sees the stamp
 * and the letter. A member can set a plan and write on the notepad.
 *
 * The host clip is output/clips/host-happy-path.webm. Re-encode before
 * sharing. Do not concat with stream copy.
 */

test('two people set the week, stamp it, and mail the letter', async ({ browser, baseURL }) => {
  test.setTimeout(180_000)
  test.skip(process.env.DEMO !== '1', 'Set DEMO=1 to record the happy path')
  test.skip(loadAllTestAccounts().length < 2, 'Create two DeepSpace test accounts first')

  const origin = baseURL ?? 'http://localhost:5173'
  const [hostAccount, friendAccount] = pickTestAccounts(2)
  fs.mkdirSync('output/clips', { recursive: true })

  const hostContext = await browser.newContext({
    storageState: await ensureStorageState(browser, hostAccount, origin),
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: 'output/clips', size: { width: 1920, height: 1080 } },
  })
  const friendContext = await browser.newContext({
    storageState: await ensureStorageState(browser, friendAccount, origin),
    viewport: { width: 1920, height: 1080 },
  })

  const host = await hostContext.newPage()
  const friend = await friendContext.newPage()

  await host.goto('/table')
  await friend.goto('/table')
  await expect(host.getByTestId('week-table')).toBeVisible()
  await expect(host.getByTestId('stamp-button')).toBeVisible()
  await expect(host.getByTestId('presence-seat')).toHaveCount(2, { timeout: 20_000 })
  await host.waitForTimeout(1200)

  await friend.getByTestId('plan-title').fill('Dinner at Minas')
  await friend.getByTestId('plan-place').fill('Minas')
  await friend.getByTestId('plan-day').selectOption('4')
  await friend.getByTestId('plan-save').click()
  await expect(host.getByTestId('day-4').getByTestId('plan-card')).toContainText('Dinner at Minas')
  await host.waitForTimeout(1600)

  await host.getByTestId('plan-title').fill('Park loop')
  await host.getByTestId('plan-place').fill('Dolores Park')
  await host.getByTestId('plan-day').selectOption('6')
  await host.getByTestId('plan-outdoor').check()
  await host.getByTestId('plan-save').click()
  await expect(host.getByTestId('day-6').getByTestId('plan-card')).toContainText('Park loop')
  await host.waitForTimeout(800)

  await host.getByTestId('stamp-button').click()
  await expect(host.getByTestId('day-6').getByTestId('weather-line')).toBeVisible({ timeout: 30_000 })
  await host.waitForTimeout(1800)

  await friend.getByTestId('notepad-input').fill('If it rains we cook')
  await friend.getByTestId('notepad-send').click()
  await expect(host.getByTestId('notepad')).toContainText('If it rains we cook')
  await host.waitForTimeout(1200)

  await host.getByTestId('write-letter').click()
  await expect(host.getByTestId('letter')).toBeVisible({ timeout: 40_000 })
  await host.waitForTimeout(2200)

  await host.getByTestId('mail-letter').click()
  await expect(host.getByTestId('letter')).toContainText('Mailed', { timeout: 30_000 })
  await host.reload()
  await expect(host.getByTestId('day-4')).toContainText('Dinner at Minas')
  await expect(host.getByTestId('letter')).toBeVisible()
  await host.waitForTimeout(1500)

  const video = host.video()
  await hostContext.close()
  await friendContext.close()
  if (video) await video.saveAs('output/clips/host-happy-path.webm')
})

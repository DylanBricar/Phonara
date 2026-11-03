import { expect, test } from "@playwright/test";
import type {} from "./fixtures/audio-player";

for (const input of ["mouse", "touch"] as const) {
  test(`releasing the ${input} seek control without moving preserves playback position`, async ({
    page,
  }) => {
    await page.goto("/tests/fixtures/audio-player.html");
    await page.waitForFunction(() => window.audioPlayerFixture !== undefined);
    await page.evaluate(() =>
      window.audioPlayerFixture.mount({ initialBlob: true }),
    );
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Pause", exact: true }),
    ).toBeVisible();
    await page.locator("audio").evaluate((audio: HTMLAudioElement) => {
      audio.currentTime = 12;
    });
    const slider = page.getByRole("slider", {
      name: "Playback position",
      exact: true,
    });
    await expect
      .poll(async () => Number(await slider.inputValue()))
      .toBeGreaterThan(11);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    const position = Number(await slider.inputValue());
    await slider.dispatchEvent(input === "mouse" ? "mousedown" : "touchstart");
    // Let React install the end listener without sending a change event.
    await page.evaluate(() => new Promise(requestAnimationFrame));
    await page.evaluate((input) => {
      document.dispatchEvent(
        new Event(input === "mouse" ? "mouseup" : "touchend"),
      );
    }, input);
    await expect(slider).toHaveValue(String(position));
    expect(
      await page
        .locator("audio")
        .evaluate((audio: HTMLAudioElement) => audio.currentTime),
    ).toBeCloseTo(position, 2);
    await page.evaluate(() => window.audioPlayerFixture.unmount());
  });
}

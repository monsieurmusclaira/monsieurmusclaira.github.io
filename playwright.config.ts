import { defineConfig } from "@playwright/test";

const browsers = ["chromium", "firefox", "webkit"] as const;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 3,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4322",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: browsers.flatMap((browserName) => [
    { name: `${browserName}-desktop`, use: { browserName, viewport: { width: 1280, height: 720 } } },
    { name: `${browserName}-mobile`, use: { browserName, viewport: { width: 390, height: 844 } } },
  ]),
  // Separate foreground server: does not stop or reuse the visitor's port 4321.
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4322 --ignore-lock",
    url: "http://127.0.0.1:4322",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});

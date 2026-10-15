import { chromium } from "playwright";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const bases = ["http://localhost:5173", process.env.IMSCCA_TUNNEL_URL || "https://l2clz45f-5173.asse.devtunnels.ms"];
const viewports = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 844, height: 390 }, { width: 1440, height: 900 }];
const output = new URL("../.tmp/landing-ui-qa/", import.meta.url);
fs.mkdirSync(output, { recursive: true });
const checks = [];
const failures = [];
const record = (name, ok, detail = "") => { checks.push({ name, ok, detail }); if (!ok) failures.push({ name, detail }); };
const browser = await chromium.launch({ headless: true });

try {
  for (const base of bases) {
    for (const viewport of viewports) {
      console.log(`Testing ${base} at ${viewport.width}x${viewport.height}`);
      const context = await browser.newContext({ viewport, extraHTTPHeaders: base.includes("devtunnels") ? { "X-Tunnel-Skip-AntiPhishing-Page": "1" } : undefined });
      const page = await context.newPage();
      const consoleErrors = [];
      const requestFailures = [];
      page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("401")) consoleErrors.push(message.text()); });
      page.on("requestfailed", (request) => requestFailures.push(`${request.url()}: ${request.failure()?.errorText}`));
      await page.goto(`${base}/landing`, { waitUntil: base.includes("devtunnels") ? "commit" : "domcontentloaded", timeout: 45000 });
      const proceed = page.getByRole("button", { name: "Continue" });
      if (await proceed.isVisible({ timeout: 1500 }).catch(() => false)) {
        await proceed.click();
        await page.goto(`${base}/landing`, { waitUntil: "domcontentloaded", timeout: 45000 });
      }
      await page.getByRole("heading", { name: "Revolutionize Your Campus Clubs." }).waitFor({ state: "visible", timeout: 15000 });
      await page.waitForTimeout(700);
      const state = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        cards: document.querySelectorAll(".landing-carousel-sequence:not([aria-hidden]) .landing-carousel-card").length,
        duplicateCards: document.querySelectorAll('.landing-carousel-sequence[aria-hidden="true"] .landing-carousel-card').length,
        visibleThemeImages: [...document.querySelectorAll(".landing-theme-shot img")].filter((node) => Number(getComputedStyle(node).opacity) > .5).length,
        heroBottom: document.querySelector("#home")?.getBoundingClientRect().bottom,
        aboutTop: document.querySelector("#about")?.getBoundingClientRect().top,
        ctaBottom: document.querySelector(".landing-hero-cta")?.getBoundingClientRect().bottom,
        ctaCenter: (() => { const rect = document.querySelector(".landing-hero-cta")?.getBoundingClientRect(); return rect ? rect.left + rect.width / 2 : NaN; })(),
        analyticsCenter: (() => { const rect = document.querySelector(".landing-shot-analytics")?.getBoundingClientRect(); return rect ? rect.left + rect.width / 2 : NaN; })(),
        aboutRows: document.querySelectorAll(".landing-about-name > span").length,
        aboutFits: (document.querySelector(".landing-about-grid")?.scrollHeight || Infinity) <= (document.querySelector("#about")?.clientHeight || 0) + 2,
        waveContained: document.querySelector("#home")?.contains(document.querySelector(".landing-wave-hero")) || false,
        waveBottomGap: (() => { const hero = document.querySelector("#home")?.getBoundingClientRect(); const wave = document.querySelector(".landing-wave-hero")?.getBoundingClientRect(); return hero && wave ? Math.abs(hero.bottom - wave.bottom) : Infinity; })(),
        shotTops: ["analytics", "payments", "events"].map((name) => document.querySelector(`.landing-shot-${name}`)?.getBoundingClientRect().top),
        breathingShots: document.querySelectorAll(".landing-shot-breathe").length,
        ctaZ: Number(getComputedStyle(document.querySelector(".landing-hero-cta")).zIndex),
        waveZ: Number(getComputedStyle(document.querySelector(".landing-wave-hero")).zIndex),
        displayFont: getComputedStyle(document.querySelector(".landing-display")).fontFamily,
        bodyFont: getComputedStyle(document.querySelector(".landing-page")).fontFamily,
      }));
      const prefix = `${base.includes("devtunnels") ? "tunnel" : "local"} ${viewport.width}x${viewport.height}`;
      record(`${prefix} no document overflow`, state.scrollWidth <= state.clientWidth + 1, JSON.stringify(state));
      record(`${prefix} one logical carousel set`, state.cards === 6, String(state.cards));
      record(`${prefix} one hidden loop duplicate`, state.duplicateCards === 6, String(state.duplicateCards));
      record(`${prefix} three matching theme previews`, state.visibleThemeImages === 3, String(state.visibleThemeImages));
      record(`${prefix} sections do not overlap`, Number(state.aboutTop) >= Number(state.heroBottom) - 1, JSON.stringify(state));
      record(`${prefix} CTA is in first viewport`, Number(state.ctaBottom) <= viewport.height, JSON.stringify(state));
      record(`${prefix} CTA aligns with Analytics`, Math.abs(Number(state.ctaCenter) - Number(state.analyticsCenter)) < 1, JSON.stringify(state));
      record(`${prefix} hero wave is bottom-contained`, state.waveContained && state.waveBottomGap <= 1, JSON.stringify(state));
      record(`${prefix} CTA is above hero wave`, state.ctaZ > state.waveZ, JSON.stringify(state));
      record(`${prefix} screenshot elevations are staggered`, Number(state.shotTops[0]) < Number(state.shotTops[1]) && Number(state.shotTops[1]) < Number(state.shotTops[2]), JSON.stringify(state));
      record(`${prefix} all hero screenshots breathe`, state.breathingShots === 3, String(state.breathingShots));
      record(`${prefix} acronym has six rows`, state.aboutRows === 6, String(state.aboutRows));
      record(`${prefix} about composition fits section`, state.aboutFits, JSON.stringify(state));
      record(`${prefix} local heading font`, state.displayFont.includes("Inter Tight"), state.displayFont);
      record(`${prefix} local body font`, state.bodyFont.includes("Source Sans 3"), state.bodyFont);
      record(`${prefix} no console errors`, consoleErrors.length === 0, consoleErrors.join("\n"));
      record(`${prefix} no failed requests`, requestFailures.length === 0, requestFailures.join("\n"));
      if (viewport.width === 390 || viewport.width === 1440) {
        await page.screenshot({ path: fileURLToPath(new URL(`${base.includes("devtunnels") ? "tunnel" : "local"}-${viewport.width}-${viewport.height}.png`, output)), fullPage: true });
      }
      await page.locator("#about").evaluate((element) => element.scrollIntoView({ block: "start" }));
      await page.waitForTimeout(500);
      const visibleAbout = await page.evaluate(() => {
        const grid = document.querySelector(".landing-about-grid").getBoundingClientRect();
        const nav = document.querySelector("nav").getBoundingClientRect();
        return { gridTop: grid.top, gridBottom: grid.bottom, navBottom: nav.bottom, viewportHeight: innerHeight };
      });
      record(`${prefix} about is visible below fixed navigation`, visibleAbout.gridTop >= visibleAbout.navBottom - 1 && visibleAbout.gridBottom <= visibleAbout.viewportHeight + 1, JSON.stringify(visibleAbout));
      await context.close();
    }
  }

  const motionContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const motionPage = await motionContext.newPage();
  await motionPage.goto(`${bases[0]}/landing`, { waitUntil: "domcontentloaded" });
  await motionPage.getByRole("heading", { name: "Revolutionize Your Campus Clubs." }).waitFor({ state: "visible" });
  const root = motionPage.locator(".landing-page");
  const breathing = motionPage.locator(".landing-shot-breathe");
  const breathingY1 = await breathing.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
  await motionPage.waitForTimeout(350);
  const breathingY2 = await breathing.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
  record("all hero screenshots animate", breathingY1.length === 3 && breathingY1.every((top, index) => Math.abs(top - breathingY2[index]) > .05), `${breathingY1.join(",")} -> ${breathingY2.join(",")}`);
  const initialScroll = await root.evaluate((element) => element.scrollTop);
  await motionPage.waitForTimeout(12000);
  const laterScroll = await root.evaluate((element) => element.scrollTop);
  record("carousel never moves the page vertically", initialScroll === 0 && laterScroll === 0, `${initialScroll} -> ${laterScroll}`);
  const track = motionPage.locator(".landing-carousel-track");
  const readX = () => track.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41);
  const x1 = await readX();
  await motionPage.waitForTimeout(500);
  const x2 = await readX();
  record("carousel moves continuously", x2 < x1 - 3 && x2 > x1 - 15, `${x1} -> ${x2}`);
  const viewport = motionPage.locator(".landing-carousel-viewport");
  await viewport.hover();
  const hoverX1 = await readX();
  await motionPage.waitForTimeout(400);
  const hoverX2 = await readX();
  record("hover pauses carousel", Math.abs(hoverX2 - hoverX1) < .5, `${hoverX1} -> ${hoverX2}`);
  await motionPage.mouse.move(0, 0);
  await viewport.focus();
  const focusX1 = await readX();
  await motionPage.waitForTimeout(400);
  const focusX2 = await readX();
  record("focus pauses carousel", Math.abs(focusX2 - focusX1) < .5, `${focusX1} -> ${focusX2}`);
  await viewport.press("ArrowRight");
  const keyboardX = await readX();
  record("keyboard arrows nudge carousel", Math.abs(keyboardX - focusX2) > 250, `${focusX2} -> ${keyboardX}`);
  await viewport.evaluate((element) => element.blur());
  const pause = motionPage.getByRole("button", { name: "Pause feature carousel" });
  await pause.click();
  const pausedX1 = await readX();
  await motionPage.waitForTimeout(500);
  const pausedX2 = await readX();
  record("pause control stops carousel", Math.abs(pausedX2 - pausedX1) < .5, `${pausedX1} -> ${pausedX2}`);
  await motionPage.getByRole("button", { name: "Play feature carousel" }).click();
  await motionPage.getByRole("button", { name: "Pause feature carousel" }).evaluate((element) => element.blur());
  await motionPage.mouse.move(0, 0);
  await motionPage.waitForTimeout(2100);
  const box = await viewport.boundingBox();
  if (box) {
    await motionPage.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await motionPage.mouse.down();
    await motionPage.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2, { steps: 5 });
    await motionPage.mouse.up();
    await viewport.evaluate((element) => element.blur());
    await motionPage.mouse.move(0, 0);
    const dragX1 = await readX();
    await motionPage.waitForTimeout(150);
    const dragX2 = await readX();
    await motionPage.waitForTimeout(150);
    const dragX3 = await readX();
    const firstMomentumStep = Math.abs(dragX2 - dragX1);
    const secondMomentumStep = Math.abs(dragX3 - dragX2);
    record("drag release has momentum", firstMomentumStep > 3, `${dragX1} -> ${dragX2}`);
    record("drag momentum decelerates", secondMomentumStep > 0 && secondMomentumStep < firstMomentumStep, `${firstMomentumStep} -> ${secondMomentumStep}`);
    await motionPage.waitForTimeout(1700);
    const dragX4 = await readX();
    await motionPage.waitForTimeout(400);
    const dragX5 = await readX();
    record("carousel returns to continuous speed", dragX5 < dragX4 - 3, `${dragX4} -> ${dragX5}`);
  } else {
    record("drag release has momentum", false, "carousel viewport has no bounding box");
    record("drag momentum decelerates", false, "carousel viewport has no bounding box");
    record("carousel returns to continuous speed", false, "carousel viewport has no bounding box");
  }
  await motionPage.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); });
  const hiddenX1 = await readX();
  await motionPage.waitForTimeout(400);
  const hiddenX2 = await readX();
  record("hidden page pauses carousel", Math.abs(hiddenX2 - hiddenX1) < .5, `${hiddenX1} -> ${hiddenX2}`);
  await motionPage.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); });
  await motionContext.close();

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${bases[0]}/landing`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Revolutionize Your Campus Clubs." }).waitFor({ state: "visible" });
  record("reduced motion hides autoplay control", await page.getByRole("button", { name: /feature carousel/i }).count() === 0);
  const reducedState = await page.evaluate(() => ({ transform: getComputedStyle(document.querySelector(".landing-carousel-track")).transform, duplicateDisplay: getComputedStyle(document.querySelector('.landing-carousel-sequence[aria-hidden="true"]')).display }));
  record("reduced motion disables track transform", reducedState.transform === "none", reducedState.transform);
  record("reduced motion removes visual duplicate", reducedState.duplicateDisplay === "none", reducedState.duplicateDisplay);
  await context.close();
} finally {
  await browser.close();
}

console.log(JSON.stringify({ checks: checks.length, failures, artifacts: output.pathname }, null, 2));
if (failures.length) process.exitCode = 1;

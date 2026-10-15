import { chromium, request } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const appBase = process.env.IMSCCA_CAPTURE_URL || "http://localhost:5173";
const apiBase = process.env.IMSCCA_API_URL || "http://localhost/my-app-server";
const stamp = Date.now().toString();
const password = "LandingCapture123!";
const outputDir = fileURLToPath(new URL("../src/assets/", import.meta.url));
const mediaDir = fileURLToPath(new URL("./fixtures/landing-media/", import.meta.url));
const mysql = process.env.IMSCCA_MYSQL || "D:\\XAMPP\\mysql\\bin\\mysql.exe";
const names = [
  ["Alyssa", "Reyes"], ["Marco", "Santos"], ["Bea", "Villanueva"], ["Nico", "Garcia"],
  ["Trisha", "Mendoza"], ["Paolo", "Cruz"], ["Sam", "Navarro"], ["Kara", "Flores"],
  ["Luis", "Ramos"], ["Mika", "Castillo"], ["Jules", "Aquino"], ["Rina", "Torres"],
  ["Theo", "Bautista"], ["Iris", "Lim"], ["Carlo", "Diaz"],
];
const portraitFiles = Array.from({ length: 8 }, (_, index) => `portrait-${String(index + 1).padStart(2, "0")}.jpg`);
const eventFiles = Array.from({ length: 5 }, (_, index) => `event-${String(index + 1).padStart(2, "0")}.jpg`);

const imageDataUrl = (file) => `data:image/jpeg;base64,${fs.readFileSync(`${mediaDir}/${file}`).toString("base64")}`;

async function call(context, path, options = {}) {
  const response = await context.fetch(`${apiBase}/${path}`, options);
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok()) throw new Error(`${path} returned ${response.status()}: ${JSON.stringify(body)}`);
  return body;
}

const mysqlDate = (date) => date.toISOString().slice(0, 19).replace("T", " ");

async function setupFixture() {
  const context = await request.newContext();
  const adviser = {
    school_id: `DEMOADV${stamp}`, fname: "Elena", mname: "M", lname: "Mercado",
    email: `demo-adviser-${stamp}@example.test`, course: "Student Affairs", year: "N/A",
    section: "N/A", club: `Harborview Innovation Society ${stamp}`, password,
  };
  const registration = await call(context, "register.php", { method: "POST", data: adviser });
  await call(context, "login.php", { method: "POST", data: { school_id: adviser.school_id, password } });
  const clubId = Number(registration.club_id);
  const members = [];
  await call(context, "update_user.php", { method: "POST", data: {
    user_id: Number(registration.user_id), school_id: adviser.school_id, fname: adviser.fname,
    mname: adviser.mname, lname: adviser.lname, email: adviser.email, role: "adviser",
    course: adviser.course, year: adviser.year, section: adviser.section, avatar: imageDataUrl(portraitFiles[0]),
  } });

  for (let index = 0; index < names.length; index += 1) {
    const role = index === 0 ? "president" : index < 3 ? "officer" : "member";
    const invite = await call(context, "generate_invite.php", { method: "POST", data: { role, allowed: 1, expiry: 24 } });
    const token = new URL(invite.link, appBase).searchParams.get("invite");
    const [fname, lname] = names[index];
    const member = {
      school_id: `HIS${stamp.slice(-5)}${String(index + 1).padStart(2, "0")}`,
      fname, mname: index % 3 === 0 ? "A" : "", lname,
      email: `demo-member-${stamp}-${index + 1}@example.test`, course: index % 2 ? "BS Information Technology" : "BS Computer Science",
      year: String((index % 4) + 1), section: String.fromCharCode(65 + (index % 3)), invite_token: token, password,
    };
    const created = await call(context, "register.php", { method: "POST", data: member });
    await call(context, "update_user.php", { method: "POST", data: {
      user_id: Number(created.user_id), school_id: member.school_id, fname: member.fname,
      mname: member.mname, lname: member.lname, email: member.email, role,
      course: member.course, year: member.year, section: member.section,
      avatar: imageDataUrl(portraitFiles[(index + 1) % portraitFiles.length]),
    } });
    members.push({ ...member, user_id: Number(created.user_id) });
  }

  const now = Date.now();
  const events = [
    ["Leadership Summit", "Auditorium", -14, -14, "completed"],
    ["Community Technology Workshop", "Innovation Lab", -4, -4, "completed"],
    ["Campus Organizations Expo", "University Quadrangle", 5, 5, "scheduled"],
    ["General Assembly", "Conference Hall", 12, 12, "scheduled"],
    ["Peer Mentoring Session", "Learning Commons", 20, 20, "scheduled"],
  ];
  for (let eventIndex = 0; eventIndex < events.length; eventIndex += 1) {
    const [title, location, startDay, endDay, status] = events[eventIndex];
    const start = new Date(now + Number(startDay) * 86400000); start.setHours(9, 0, 0, 0);
    const end = new Date(now + Number(endDay) * 86400000); end.setHours(16, 0, 0, 0);
    await call(context, "add_requirement_with_registrations.php", { method: "POST", data: {
      title, description: `Harborview Innovation Society ${title.toLowerCase()} for active members.`,
      start_datetime: mysqlDate(start), end_datetime: mysqlDate(end), location,
      requirement_type: "event", status, amount_due: 0, req_picture: imageDataUrl(eventFiles[eventIndex]),
      selected_users: members.slice(3).map((member) => member.user_id),
    } });
  }

  const fees = [
    ["Annual Membership Contribution", 600], ["Organization Shirt", 450],
    ["Leadership Summit Materials", 350], ["Campus Expo Contribution", 250],
  ];
  const feeIds = [];
  for (let index = 0; index < fees.length; index += 1) {
    const [title, amount] = fees[index];
    const start = new Date(now - 20 * 86400000); const end = new Date(now + (14 + index * 7) * 86400000);
    const result = await call(context, "add_requirement.php", { method: "POST", data: {
      title, description: `Fictional ${String(title).toLowerCase()} for presentation capture.`,
      requirement_type: "fee", amount_due: amount, start_datetime: mysqlDate(start),
      end_datetime: mysqlDate(end), status: "scheduled",
    } });
    const found = (result.requirements || []).find((item) => item.title === title);
    if (!found) throw new Error(`Could not resolve fee ${title}`);
    feeIds.push(Number(found.requirement_id));
  }

  for (const feeId of feeIds) {
    await call(context, "add_transaction.php", { method: "POST", data: {
      user_ids: members.slice(3).map((member) => member.user_id), requirement_ids: [feeId],
      fee_description: "Presentation fixture", amount_paid: 0, payment_status: "unpaid", payment_method: "",
    } });
  }
  const transactions = await call(context, "get_transaction.php");
  for (let index = 0; index < transactions.length; index += 1) {
    if (index % 3 === 2) continue;
    const transaction = transactions[index];
    const balance = Number(transaction.balance ?? transaction.amount_due);
    const amount = index % 3 === 0 ? balance : Math.max(50, Math.round(balance * 0.45));
    await call(context, "record_payment.php", { method: "POST", data: {
      transaction_id: Number(transaction.transaction_id), amount, payment_method: index % 2 ? "GCash" : "Cash",
      reference: `HIS-${String(index + 1).padStart(4, "0")}`, idempotency_key: `landing_${stamp}_${index}`,
    } });
  }
  const adviserId = Number(registration.user_id);
  const attendanceSql = `INSERT INTO attendance_records (user_id, requirement_id, slot_id, verified_by, club_id, scan_datetime, attendance_status, notes) SELECT u.user_id, r.requirement_id, NULL, ${adviserId}, ${clubId}, DATE_ADD(r.start_datetime, INTERVAL 15 MINUTE), CASE MOD(u.user_id + r.requirement_id, 5) WHEN 0 THEN 'late' WHEN 1 THEN 'absent' ELSE 'present' END, 'Presentation fixture' FROM users u CROSS JOIN requirements r WHERE u.club_id=${clubId} AND LOWER(u.role)='member' AND r.club_id=${clubId} AND r.requirement_type='event' AND r.status='completed'`;
  execFileSync(mysql, ["-u", "root", "db_imscca", "-e", attendanceSql]);
  await context.dispose();
  return { clubId, adviser };
}

async function login(page, adviser) {
  await page.goto(`${appBase}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel(/school id/i).fill(adviser.school_id);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
}

async function capture(page, route, name, theme) {
  await page.evaluate((preference) => localStorage.setItem("theme", preference), theme);
  await page.goto(`${appBase}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.fonts.status === "loaded");
  const expectedText = route === "/requirements" ? "Annual Membership Contribution" : "Nico Garcia";
  try {
    await page.getByText(expectedText, { exact: false }).first().waitFor({ state: "visible", timeout: 12000 });
  } catch {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByText(expectedText, { exact: false }).first().waitFor({ state: "visible", timeout: 12000 });
  }
  await page.waitForTimeout(route === "/dashboard" ? 1200 : 700);
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important} .Toastify{display:none!important}" });
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  if (dimensions.width > dimensions.viewport + 1) throw new Error(`${route} overflows: ${JSON.stringify(dimensions)}`);
  await page.screenshot({ path: `${outputDir}/hero-${name}-${theme}.png`, clip: { x: 0, y: 0, width: 1440, height: 693 } });
}

function cleanup(clubId) {
  const sql = `SET FOREIGN_KEY_CHECKS=0; DELETE FROM audit_log WHERE club_id=${clubId}; DELETE FROM member_import_rows WHERE batch_id IN (SELECT batch_id FROM member_import_batches WHERE club_id=${clubId}); DELETE FROM member_import_batches WHERE club_id=${clubId}; DELETE FROM attendance_status_history WHERE record_id IN (SELECT attendance_id FROM attendance_records WHERE club_id=${clubId}); DELETE FROM attendance_records WHERE club_id=${clubId}; DELETE FROM attendance_time_slots WHERE requirement_id IN (SELECT requirement_id FROM requirements WHERE club_id=${clubId}); DELETE FROM event_registrations WHERE requirement_id IN (SELECT requirement_id FROM requirements WHERE club_id=${clubId}); DELETE FROM requirement_registrations WHERE requirement_id IN (SELECT requirement_id FROM requirements WHERE club_id=${clubId}); DELETE FROM automatic_absence_processing WHERE requirement_id IN (SELECT requirement_id FROM requirements WHERE club_id=${clubId}); DELETE FROM transaction_payments WHERE transaction_id IN (SELECT transaction_id FROM transactions WHERE user_id IN (SELECT user_id FROM users WHERE club_id=${clubId})); DELETE FROM transactions WHERE user_id IN (SELECT user_id FROM users WHERE club_id=${clubId}); DELETE FROM approval_requests WHERE club_id=${clubId}; DELETE FROM deletion_requests WHERE club_id=${clubId}; DELETE FROM user_qr_codes WHERE club_id=${clubId}; DELETE FROM invite_links WHERE club_id=${clubId}; DELETE FROM requirements WHERE club_id=${clubId}; DELETE FROM users WHERE club_id=${clubId}; DELETE FROM club WHERE club_id=${clubId}; SET FOREIGN_KEY_CHECKS=1;`;
  execFileSync(mysql, ["-u", "root", "db_imscca", "-e", sql]);
}

let fixture;
const browser = await chromium.launch({ headless: true });
try {
  fixture = await setupFixture();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("401")) console.error(`Browser console: ${message.text()}`);
  });
  await login(page, fixture.adviser);
  for (const theme of ["dark", "light"]) {
    await capture(page, "/dashboard", "analytics", theme);
    await capture(page, "/transactions", "payments", theme);
    await capture(page, "/requirements", "events", theme);
  }
  await context.close();
  console.log("Captured six populated landing screenshots.");
} finally {
  await browser.close();
  if (fixture?.clubId) cleanup(fixture.clubId);
}

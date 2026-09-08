import { chromium, request } from 'playwright';
import QRCode from 'qrcode';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const local = 'http://localhost:5173';
const tunnel = process.env.IMSCCA_TUNNEL_URL || 'https://l2clz45f-5173.asse.devtunnels.ms';
const api = 'http://localhost/my-app-server';
const stamp = Date.now().toString();
const password = 'ReleaseQA123!';
const artifacts = new URL('../.tmp/release-qa/', import.meta.url);
fs.mkdirSync(artifacts, { recursive: true });
const report = { stamp, checks: [], consoleErrors: [], httpErrors: [], requestFailures: [], screenshots: [] };
const check = (name, ok, detail = '') => { report.checks.push({ name, ok: Boolean(ok), detail }); if (!ok) console.error(`FAIL ${name}: ${detail}`); };

async function json(ctx, path, options = {}) {
  const response = await ctx.fetch(`${api}/${path}`, options);
  const text = await response.text();
  let body; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: response.status(), ok: response.ok(), body };
}

async function setup() {
  const ctx = await request.newContext();
  const adviser = { school_id:`RELADV${stamp}`, fname:'Release', mname:'Q', lname:'Adviser', email:`reladv${stamp}@example.test`, course:'N/A', year:'N/A', section:'N/A', club:`Release QA ${stamp}`, password };
  const registered = await json(ctx, 'register.php', { method:'POST', data:adviser });
  if (!registered.ok) throw new Error(`adviser registration ${registered.status}: ${JSON.stringify(registered.body)}`);
  const login = await json(ctx, 'login.php', { method:'POST', data:{ school_id:adviser.school_id, password } });
  if (!login.ok) throw new Error(`adviser login ${login.status}: ${JSON.stringify(login.body)}`);
  const clubId = Number(login.body.club_id); const adviserId = Number(login.body.user_id);

  const makeUser = async (role) => {
    const invite = await json(ctx, 'generate_invite.php', { method:'POST', data:{ role, allowed:1, expiry:24 } });
    const token = new URL(invite.body.link, local).searchParams.get('invite');
    const prefix = role === 'officer' ? 'RELOFF' : 'RELMEM';
    const user = { school_id:`${prefix}${stamp}`, fname:'Release', mname:'Q', lname:role, email:`${role}${stamp}@example.test`, course:'BS Information Technology', year:'2', section:'A', invite_token:token, password };
    const result = await json(ctx, 'register.php', { method:'POST', data:user });
    if (!result.ok) throw new Error(`${role} registration ${result.status}: ${JSON.stringify(result.body)}`);
    return { ...user, user_id:Number(result.body.user_id) };
  };
  const officer = await makeUser('officer');
  const member = await makeUser('member');
  const start = new Date(Date.now() + 3600_000); const end = new Date(Date.now() + 7200_000);
  const mysqlDate = d => d.toISOString().slice(0,19).replace('T',' ');
  const event = await json(ctx, 'add_requirement_with_registrations.php', { method:'POST', data:{ title:`Release Event ${stamp}`, description:'Disposable scanner test', start_datetime:mysqlDate(start), end_datetime:mysqlDate(end), location:'QA Room', requirement_type:'event', status:'scheduled', amount_due:0, req_picture:'', selected_users:[member.user_id] } });
  if (!event.ok) throw new Error(`event ${event.status}: ${JSON.stringify(event.body)}`);
  const eventId = Number(event.body.requirement_id || event.body.id);
  if (!eventId) throw new Error(`event response omitted id: ${JSON.stringify(event.body)}`);
  const slot = await json(ctx, 'add_time_slot.php', { method:'POST', data:{ requirement_id:eventId, slot_name:'Check in', date:mysqlDate(start).slice(0,10), start_time:mysqlDate(start).slice(11,16), end_time:mysqlDate(end).slice(11,16) } });
  check('setup time slot', slot.ok, JSON.stringify(slot.body));
  const qr = await json(ctx, `generate_qr_code.php?user_id=${member.user_id}`);
  if (!qr.ok) throw new Error(`qr ${qr.status}: ${JSON.stringify(qr.body)}`);
  await ctx.dispose();
  return { clubId, adviserId, adviser, officer, member, eventId, qrData:qr.body.qr_code_data || qr.body.qr_data || qr.body.data };
}

async function login(page, base, schoolId) {
  await navigate(page, `${base}/login`);
  const proceed = page.getByRole('button', { name:'Continue' });
  if (await proceed.isVisible({ timeout:1500 }).catch(()=>false)) { await proceed.click(); await navigate(page, `${base}/login`); }
  await page.getByLabel(/school id/i).fill(schoolId);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole('button', { name:/log in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout:20000 });
  await page.waitForTimeout(500);
  const authenticated = await page.evaluate(async () => {
    const response = await fetch('/my-app-server/get_current_user.php', { credentials:'include' });
    return response.ok;
  });
  if (!authenticated) throw new Error(`Session did not persist after login at ${base}`);
}

async function navigate(page, url) {
  let lastError;
  for (let attempt=0; attempt<3; attempt++) {
    try {
      await page.goto(url, { waitUntil:url.includes('devtunnels.ms')?'commit':'domcontentloaded', timeout:45000 });
      await page.locator('body').waitFor({ state:'visible', timeout:15000 });
      return;
    } catch (error) { lastError=error; }
  }
  throw lastError;
}

async function inspect(page, base, role, path, viewport) {
  await page.setViewportSize(viewport);
  await navigate(page, `${base}${path}`);
  await page.waitForTimeout(700);
  const actualPath = new URL(page.url()).pathname;
  check(`${base.includes('devtunnels')?'tunnel':'local'} ${role} ${path} route remains authenticated`, actualPath === path, actualPath);
  const dimensions = await page.evaluate(() => ({ sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth }));
  check(`${base.includes('devtunnels')?'tunnel':'local'} ${role} ${path} ${viewport.width}x${viewport.height} no document overflow`, dimensions.sw <= dimensions.cw + 1, JSON.stringify(dimensions));
}

async function runRole(browser, base, role, account, routes) {
  const context = await browser.newContext({ viewport:{ width:1440, height:900 }, acceptDownloads:true });
  const page = await context.newPage();
  page.on('console', m => { if (m.type()==='error' && !m.text().startsWith('Failed to load resource:')) report.consoleErrors.push({ base, role, text:m.text() }); });
  page.on('response', r => { if (r.status() >= 400 && !(r.status() === 401 && r.url().includes('get_current_user.php'))) report.httpErrors.push({ base, role, status:r.status(), url:r.url() }); });
  page.on('requestfailed', r => report.requestFailures.push({ base, role, url:r.url(), error:r.failure()?.errorText }));
  await login(page, base, account.school_id);
  for (const viewport of [{width:390,height:844},{width:768,height:1024},{width:844,height:390},{width:1440,height:900}]) {
    for (const route of routes) await inspect(page, base, role, route, viewport);
  }
  const shot = new URL(`${base.includes('devtunnels')?'tunnel':'local'}-${role}.png`, artifacts);
  const shotPath=fileURLToPath(shot);
  await page.screenshot({ path:shotPath, fullPage:true }); report.screenshots.push(shotPath);
  await context.close();
}

async function scanner(browser, setup) {
  const qrImage = await QRCode.toDataURL(setup.qrData, { width:640, margin:4 });
  const context = await browser.newContext({ viewport:{width:1440,height:900} });
  await context.addInitScript(dataUrl => {
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas=document.createElement('canvas'); canvas.width=720; canvas.height=720;
      const ctx=canvas.getContext('2d'); const img=new Image(); img.src=dataUrl; await img.decode();
      ctx.fillStyle='white'; ctx.fillRect(0,0,720,720); ctx.drawImage(img,40,40,640,640);
      return canvas.captureStream(10);
    };
  }, qrImage);
  const page=await context.newPage(); await login(page, local, setup.officer.school_id);
  await page.goto(`${local}/attendance/scan`, { waitUntil:'domcontentloaded' }); await page.waitForTimeout(1000);
  await page.getByText(`Release Event ${stamp}`, { exact:true }).click();
  await page.waitForTimeout(500);
  const start=page.getByRole('button',{name:/start|scan|camera/i}).first(); if(await start.isVisible().catch(()=>false)) await start.click();
  await page.waitForTimeout(5000); const text=(await page.locator('body').innerText()).toLowerCase();
  check('same-club generated QR decoded by scanner camera flow', /release.*member|verified|record attendance|qr.*valid/.test(text), text.slice(0,500));
  await context.close();
}

async function pdfDownload(browser, setup) {
  const context=await browser.newContext({ viewport:{width:1440,height:900}, acceptDownloads:true });
  const page=await context.newPage(); await login(page, local, setup.adviser.school_id);
  await page.goto(`${local}/reports/attendance-report`, { waitUntil:'domcontentloaded' });
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:/export pdf|pdf/i}).click();
  const download=await downloadPromise; const output=fileURLToPath(new URL('attendance-report.pdf', artifacts));
  await download.saveAs(output); const bytes=fs.readFileSync(output);
  check('attendance PDF is a nonempty valid PDF', bytes.length > 1000 && bytes.subarray(0,4).toString()==='%PDF', `${bytes.length} bytes`);
  await context.close();
}

function cleanup(clubId) {
  const mysql='D:\\XAMPP\\mysql\\bin\\mysql.exe';
  const sql=`SET FOREIGN_KEY_CHECKS=0; DELETE FROM audit_log WHERE club_id=${clubId}; DELETE FROM member_import_rows WHERE batch_id IN (SELECT batch_id FROM member_import_batches WHERE club_id=${clubId}); DELETE FROM member_import_batches WHERE club_id=${clubId}; DELETE FROM attendance_status_history WHERE record_id IN (SELECT attendance_id FROM attendance_records WHERE club_id=${clubId}); DELETE FROM attendance_records WHERE club_id=${clubId}; DELETE FROM attendance_time_slots WHERE requirement_id IN (SELECT requirement_id FROM requirements WHERE club_id=${clubId}); DELETE FROM event_registrations WHERE requirement_id IN (SELECT requirement_id FROM requirements WHERE club_id=${clubId}); DELETE FROM automatic_absence_processing WHERE requirement_id IN (SELECT requirement_id FROM requirements WHERE club_id=${clubId}); DELETE FROM transactions WHERE user_id IN (SELECT user_id FROM users WHERE club_id=${clubId}); DELETE FROM approval_requests WHERE club_id=${clubId}; DELETE FROM deletion_requests WHERE club_id=${clubId}; DELETE FROM user_qr_codes WHERE club_id=${clubId}; DELETE FROM invite_links WHERE club_id=${clubId}; DELETE FROM requirements WHERE club_id=${clubId}; DELETE FROM users WHERE club_id=${clubId}; DELETE FROM club WHERE club_id=${clubId}; SET FOREIGN_KEY_CHECKS=1;`;
  execFileSync(mysql, ['-u','root','db_imscca','-e',sql]);
}

let setupData; const browser=await chromium.launch({ headless:true });
try {
  setupData=await setup();
  await runRole(browser, local, 'adviser', setupData.adviser, ['/dashboard','/members','/requirements','/transactions','/attendance/list','/attendance/config','/attendance/scan','/reports/attendance-report','/reports/transaction-report','/approvals','/history']);
  await runRole(browser, local, 'officer', setupData.officer, ['/dashboard','/members','/requirements','/transactions','/attendance/list','/attendance/config','/attendance/scan','/reports/attendance-report','/reports/transaction-report','/history']);
  await runRole(browser, local, 'member', setupData.member, ['/dashboard','/history']);
  await runRole(browser, tunnel, 'member', setupData.member, ['/dashboard','/history']);
  await pdfDownload(browser, setupData);
  await scanner(browser, setupData);
} finally {
  await browser.close(); if(setupData?.clubId) cleanup(setupData.clubId);
  fs.writeFileSync(new URL('report.json', artifacts), JSON.stringify(report,null,2));
}
const failures=report.checks.filter(c=>!c.ok);
console.log(JSON.stringify({ checks:report.checks.length, failures, consoleErrors:report.consoleErrors, httpErrors:report.httpErrors, requestFailures:report.requestFailures, report:new URL('report.json',artifacts).pathname },null,2));
if(failures.length || report.consoleErrors.length || report.httpErrors.length || report.requestFailures.length) process.exitCode=1;

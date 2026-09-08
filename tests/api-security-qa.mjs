import { request } from 'playwright';
import { execFileSync, spawn } from 'node:child_process';

const mysql = 'D:\\XAMPP\\mysql\\bin\\mysql.exe';
const mysqldump = 'D:\\XAMPP\\mysql\\bin\\mysqldump.exe';
const php = 'D:\\XAMPP\\php\\php.exe';
const database = 'db_imscca_test';
const port = 18099;
const api = `http://127.0.0.1:${port}`;
const stamp = Date.now().toString();
const password = 'ApiQA123!';
const checks = [];

const check = (name, condition, detail = '') => {
  checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}: ${detail}`);
};

const mysqlExec = (sql, db = database) => execFileSync(
  mysql,
  ['-u', 'root', ...(db ? [db] : []), '-N', '-B', '-e', sql],
  { encoding: 'utf8' },
).trim();

async function call(context, endpoint, options = {}) {
  const response = await context.fetch(`${api}/${endpoint}`, options);
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: response.status(), ok: response.ok(), body };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${api}/get_current_user.php`);
      if (response.status === 401) return;
    } catch { /* Server is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('PHP integration server did not start.');
}

async function createClub(label) {
  const context = await request.newContext();
  const adviser = {
    school_id: `APIADV${label}${stamp}`,
    fname: 'API', mname: 'Q', lname: `Adviser${label}`,
    email: `api-adviser-${label}-${stamp}@example.test`,
    course: 'N/A', year: 'N/A', section: 'N/A',
    club: `API Security ${label} ${stamp}`, password,
  };
  const registered = await call(context, 'register.php', { method: 'POST', data: adviser });
  check(`register adviser ${label}`, registered.ok, JSON.stringify(registered.body));
  const login = await call(context, 'login.php', { method: 'POST', data: { school_id: adviser.school_id, password } });
  check(`login adviser ${label}`, login.ok, JSON.stringify(login.body));
  return { context, adviser, clubId: Number(login.body.club_id), adviserId: Number(login.body.user_id) };
}

async function createInvitedUser(club, role, label) {
  const invite = await call(club.context, 'generate_invite.php', { method: 'POST', data: { role, allowed: 1, expiry: 24 } });
  check(`generate ${role} invite ${label}`, invite.ok, JSON.stringify(invite.body));
  const token = new URL(invite.body.link, 'http://localhost').searchParams.get('invite');
  const account = {
    school_id: `API${role.slice(0, 3).toUpperCase()}${label}${stamp}`,
    fname: 'API', mname: 'Q', lname: `${role}${label}`,
    email: `api-${role}-${label}-${stamp}@example.test`,
    course: 'BS Information Technology', year: '2', section: 'A',
    invite_token: token, password,
  };
  const registrationContext = await request.newContext();
  const registered = await call(registrationContext, 'register.php', { method: 'POST', data: account });
  await registrationContext.dispose();
  check(`register ${role} ${label}`, registered.ok, JSON.stringify(registered.body));
  const context = await request.newContext();
  const login = await call(context, 'login.php', { method: 'POST', data: { school_id: account.school_id, password } });
  check(`login ${role} ${label}`, login.ok, JSON.stringify(login.body));
  return { context, account, userId: Number(login.body.user_id) };
}

async function addRequirement(context, title, type, amount = 0) {
  const start = new Date(Date.now() + 3_600_000).toISOString().slice(0, 19).replace('T', ' ');
  const end = new Date(Date.now() + 7_200_000).toISOString().slice(0, 19).replace('T', ' ');
  const result = await call(context, 'add_requirement.php', {
    method: 'POST',
    data: { title, description: 'Isolated API fixture', start_datetime: start, end_datetime: end, location: 'QA', requirement_type: type, status: 'scheduled', amount_due: amount },
  });
  check(`create ${type} ${title}`, result.ok, JSON.stringify(result.body));
  return Number(result.body.requirements.find(item => item.title === title).requirement_id);
}

let server;
const contexts = [];
try {
  mysqlExec(`DROP DATABASE IF EXISTS ${database}; CREATE DATABASE ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`, '');
  const schema = execFileSync(mysqldump, ['-u', 'root', '--no-data', '--skip-comments', 'db_imscca']);
  execFileSync(mysql, ['-u', 'root', database], { input: schema });

  server = spawn(php, ['-S', `127.0.0.1:${port}`, '-t', 'src/my-app-server'], {
    cwd: process.cwd(),
    env: { ...process.env, IMSCCA_DB_NAME: database },
    stdio: 'ignore',
  });
  await waitForServer();

  const clubA = await createClub('A');
  const clubB = await createClub('B');
  contexts.push(clubA.context, clubB.context);
  const officerA = await createInvitedUser(clubA, 'officer', 'A');
  const officerB = await createInvitedUser(clubB, 'officer', 'B');
  const memberA = await createInvitedUser(clubA, 'member', 'A');
  const memberB = await createInvitedUser(clubB, 'member', 'B');
  contexts.push(officerA.context, officerB.context, memberA.context, memberB.context);

  const feeA = await addRequirement(clubA.context, `Fee A ${stamp}`, 'fee', 100);
  const feeB = await addRequirement(clubB.context, `Fee B ${stamp}`, 'fee', 100);
  const eventA = await addRequirement(clubA.context, `Event A ${stamp}`, 'event');
  const eventB = await addRequirement(clubB.context, `Event B ${stamp}`, 'event');

  const invalidPayment = await call(clubA.context, 'add_transaction.php', { method: 'POST', data: { user_ids: [memberA.userId], requirement_ids: [feeA], amount_paid: 0, payment_status: 'paid', payment_method: 'cash', fee_description: 'Invalid' } });
  check('reject inconsistent payment state', invalidPayment.status === 400, JSON.stringify(invalidPayment.body));
  const foreignAdd = await call(clubA.context, 'add_transaction.php', { method: 'POST', data: { user_ids: [memberB.userId], requirement_ids: [feeA], amount_paid: 0, payment_status: 'unpaid', payment_method: '', fee_description: 'Foreign' } });
  check('reject cross-club transaction creation', foreignAdd.status === 404, JSON.stringify(foreignAdd.body));

  const ownA = await call(clubA.context, 'add_transaction.php', { method: 'POST', data: { user_ids: [memberA.userId], requirement_ids: [feeA], amount_paid: 0, payment_status: 'unpaid', payment_method: '', fee_description: 'Own A' } });
  const ownB = await call(clubB.context, 'add_transaction.php', { method: 'POST', data: { user_ids: [memberB.userId], requirement_ids: [feeB], amount_paid: 0, payment_status: 'unpaid', payment_method: '', fee_description: 'Own B' } });
  check('create own-club transactions', ownA.ok && ownB.ok, `${ownA.status}/${ownB.status}`);
  const transactionB = Number(mysqlExec(`SELECT transaction_id FROM transactions WHERE requirement_id=${feeB} LIMIT 1;`));
  const foreignUpdate = await call(clubA.context, 'update_transaction.php', { method: 'POST', data: { transaction_id: transactionB, amount_paid: 100, payment_status: 'paid' } });
  check('reject cross-club transaction update', foreignUpdate.status === 404, JSON.stringify(foreignUpdate.body));
  check('foreign transaction remains unchanged', mysqlExec(`SELECT CONCAT(amount_paid,':',payment_status) FROM transactions WHERE transaction_id=${transactionB};`) === '0.00:unpaid');

  const elevateInvite = await call(officerA.context, 'generate_invite.php', { method: 'POST', data: { role: 'officer', allowed: 1, expiry: 24 } });
  check('officer cannot invite privileged role', elevateInvite.status === 403, JSON.stringify(elevateInvite.body));
  const adviserInvite = await call(clubA.context, 'generate_invite.php', { method: 'POST', data: { role: 'adviser', allowed: 1, expiry: 24 } });
  check('club cannot create second adviser invite', adviserInvite.status === 403, JSON.stringify(adviserInvite.body));
  const memberList = await call(memberA.context, 'get_user.php');
  check('member cannot list club users', memberList.status === 403, JSON.stringify(memberList.body));
  const slotDelete = await call(officerA.context, 'delete_time_slot.php', { method: 'POST', data: { slot_id: 999999 } });
  check('officer cannot delete attendance configuration', slotDelete.status === 403, JSON.stringify(slotDelete.body));

  const registration = await call(memberA.context, 'register_for_event.php', { method: 'POST', data: { requirement_id: eventA } });
  check('member can register self for own-club event', registration.ok, JSON.stringify(registration.body));
  const foreignRegistration = await call(memberA.context, 'register_for_event.php', { method: 'POST', data: { requirement_id: eventB } });
  check('member cannot register for foreign event', foreignRegistration.status === 404, JSON.stringify(foreignRegistration.body));

  mysqlExec(`INSERT INTO attendance_records(user_id,requirement_id,verified_by,club_id,attendance_status,notes) VALUES(${memberA.userId},${eventA},${clubA.adviserId},${clubA.clubId},'present','Fixture'),(${memberB.userId},${eventB},${clubB.adviserId},${clubB.clubId},'present','Fixture');`);
  const attendanceA = Number(mysqlExec(`SELECT attendance_id FROM attendance_records WHERE requirement_id=${eventA} LIMIT 1;`));
  const attendanceB = Number(mysqlExec(`SELECT attendance_id FROM attendance_records WHERE requirement_id=${eventB} LIMIT 1;`));
  const directEdit = await call(clubA.context, 'update_attendance_record.php', { method: 'POST', data: { attendance_id: attendanceA, attendance_status: 'late', notes: 'Adviser edit' } });
  check('adviser can directly edit own attendance', directEdit.ok, JSON.stringify(directEdit.body));
  const foreignEditRequest = await call(officerA.context, 'add_attendance_request.php', { method: 'POST', data: { type: 'attendance', target_id: attendanceB, approval_type: 'attendance_edit', reason: 'Foreign', new_data: { attendance_status: 'absent' } } });
  check('reject cross-club attendance request', foreignEditRequest.status === 404, JSON.stringify(foreignEditRequest.body));
  const editRequest = await call(officerA.context, 'add_attendance_request.php', { method: 'POST', data: { type: 'attendance', target_id: attendanceA, approval_type: 'attendance_edit', reason: 'Correction', new_data: { attendance_status: 'excused', notes: 'Approved correction' } } });
  check('officer can request own-club attendance edit', editRequest.ok, JSON.stringify(editRequest.body));
  const approved = await call(clubA.context, 'approve_deletion_request.php', { method: 'POST', data: { request_id: Number(editRequest.body.request_id) } });
  check('adviser can approve attendance edit', approved.ok, JSON.stringify(approved.body));
  check('approved edit uses edit_data payload', mysqlExec(`SELECT CONCAT(attendance_status,':',notes) FROM attendance_records WHERE attendance_id=${attendanceA};`) === 'excused:Approved correction');

  const pendingB = await call(officerB.context, 'add_attendance_request.php', { method: 'POST', data: { type: 'attendance', target_id: attendanceB, approval_type: 'attendance_edit', reason: 'Club B', new_data: { attendance_status: 'late' } } });
  const crossApproval = await call(clubA.context, 'approve_deletion_request.php', { method: 'POST', data: { request_id: Number(pendingB.body.request_id) } });
  check('adviser cannot approve foreign-club request', crossApproval.status === 404, JSON.stringify(crossApproval.body));

  console.log(JSON.stringify({ checks: checks.length, failures: checks.filter(item => !item.ok) }, null, 2));
} finally {
  await Promise.all(contexts.map(context => context.dispose().catch(() => {})));
  if (server && !server.killed) server.kill();
  mysqlExec(`DROP DATABASE IF EXISTS ${database};`, '');
}

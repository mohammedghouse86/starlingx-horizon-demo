// Smoke test: node scripts/smoke-test.js http://localhost:3000
// Run against a fresh server, because the test creates and deletes records.
const base = process.argv[2] || 'http://localhost:3000';
const PASSWORD = 'Demo@123';
let failures = 0;

async function call(method, path, token, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function check(name, cond, extra) {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond || extra === undefined ? '' : ' -> ' + JSON.stringify(extra)));
  if (!cond) failures++;
}

(async () => {
  const health = await call('GET', '/api/health');
  check('health', health.status === 200);

  const login = await call('POST', '/api/auth/login', null, { email: 'admin@starlingx-demo.example', password: PASSWORD });
  check('admin login', login.status === 200 && login.data.token, login);
  const admin = login.data.token;

  const bad = await call('POST', '/api/auth/login', null, { email: 'admin@starlingx-demo.example', password: 'wrong' });
  check('wrong password rejected', bad.status === 401);

  const anon = await call('GET', '/api/projects');
  check('anonymous request rejected', anon.status === 401);

  const projects = await call('GET', '/api/projects', admin);
  check('seeded projects (>= 14)', projects.data.projects && projects.data.projects.length >= 14, projects.data.projects && projects.data.projects.length);
  const pid = projects.data.projects[0].id;

  const users = await call('GET', '/api/users', admin);
  check('seeded users (>= 100)', users.data.users && users.data.users.length >= 100, users.data.users && users.data.users.length);

  const instances = await call('GET', `/api/projects/${pid}/instances`, admin);
  check('seeded instances in project', instances.status === 200);
  const volumes = await call('GET', `/api/projects/${pid}/volumes`, admin);
  check('seeded volumes list', volumes.status === 200);
  const networks = await call('GET', `/api/projects/${pid}/networks`, admin);
  check('networks in project', networks.data.networks && networks.data.networks.length > 0);

  // Project and user management
  const newProj = await call('POST', '/api/projects', admin, { name: 'poc-test-project', description: 'Smoke test' });
  check('create project', newProj.status === 201, newProj);
  const npid = newProj.data.project.id;

  const dup = await call('POST', '/api/projects', admin, { name: 'poc-test-project' });
  check('duplicate project rejected', dup.status === 409);

  const newUser = await call('POST', '/api/users', admin, { name: 'POC Tester', email: 'poc.tester@starlingx-demo.example', password: 'Poc@12345', role: 'member' });
  check('create user', newUser.status === 201, newUser);
  const uid = newUser.data.user.id;

  const addMember = await call('POST', `/api/projects/${npid}/members`, admin, { userId: uid, role: 'member' });
  check('add user to project', addMember.status === 201, addMember);

  const pocLogin = await call('POST', '/api/auth/login', null, { email: 'poc.tester@starlingx-demo.example', password: 'Poc@12345' });
  check('new user can log in', pocLogin.status === 200, pocLogin);
  const poc = pocLogin.data.token;

  const visible = await call('GET', '/api/projects', poc);
  check('member sees only own projects', visible.data.projects.length === 1 && visible.data.projects[0].id === npid, visible.data.projects && visible.data.projects.length);

  const forbidden = await call('GET', `/api/projects/${pid}/instances`, poc);
  check('member blocked from other project', forbidden.status === 403, forbidden);

  const adminOnly = await call('GET', '/api/users', poc);
  check('member blocked from admin API', adminOnly.status === 403);

  // Instance lifecycle inside the new project
  const net = await call('POST', `/api/projects/${npid}/networks`, poc, { name: 'poc-net', cidr: '10.99.1.0/24' });
  check('create network (member)', net.status === 201, net);

  const launch = await call('POST', `/api/projects/${npid}/instances`, poc, { name: 'poc-vm-1', flavor: 'm1.small', image: 'cirros-0.6.2', networkId: net.data.network.id });
  check('launch instance', launch.status === 201, launch);
  const iid = launch.data.instance.id;

  const stopped = await call('POST', `/api/instances/${iid}/action`, poc, { action: 'stop' });
  check('stop instance', stopped.data.instance && stopped.data.instance.status === 'SHUTOFF', stopped);
  const badAction = await call('POST', `/api/instances/${iid}/action`, poc, { action: 'reboot' });
  check('reboot a stopped instance rejected', badAction.status === 409);

  // Volume lifecycle
  const vol = await call('POST', `/api/projects/${npid}/volumes`, poc, { name: 'poc-vol-1', size: 10, type: 'ceph' });
  check('create volume', vol.status === 201, vol);
  const attach = await call('POST', `/api/volumes/${vol.data.volume.id}/attach`, poc, { instanceId: iid });
  check('attach volume', attach.data.volume && attach.data.volume.status === 'in-use', attach);
  const delInUse = await call('DELETE', `/api/volumes/${vol.data.volume.id}`, poc);
  check('delete in-use volume rejected', delInUse.status === 409);
  const detach = await call('POST', `/api/volumes/${vol.data.volume.id}/detach`, poc);
  check('detach volume', detach.data.volume && detach.data.volume.status === 'available', detach);
  const delVol = await call('DELETE', `/api/volumes/${vol.data.volume.id}`, poc);
  check('delete volume', delVol.status === 200);

  const delInst = await call('DELETE', `/api/instances/${iid}`, poc);
  check('delete instance', delInst.status === 200);

  // Cleanup: remove the test project and user
  const delProj = await call('DELETE', `/api/projects/${npid}`, admin);
  check('delete project', delProj.status === 200);
  const delUser = await call('DELETE', `/api/users/${uid}`, admin);
  check('delete user', delUser.status === 200);

  const alarms = await call('GET', '/api/alarms', admin);
  check('alarms list', alarms.data.alarms && alarms.data.alarms.length > 0);

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

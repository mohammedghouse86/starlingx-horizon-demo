// StarlingX Horizon demo: REST API plus static frontend, one service.
// Data is held in memory and re-seeded on every start (Render's free disk is temporary anyway).
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { seed, hashPassword } = require('./seed');

const PORT = process.env.PORT || 3000;
const app = express();
app.disable("x-powered-by"); // Express adds this header by default; the original StarlingX dashboard does not send it
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const db = seed();
// token -> { userId, expiresAt }. Same 50-minute timeout as the original StarlingX dashboard (SESSION_TIMEOUT = 3000 s).
const SESSION_TIMEOUT_MS = 3000 * 1000;
const sessions = new Map();

function revokeSessionsFor(userId) {
  for (const [token, s] of sessions) if (s.userId === userId) sessions.delete(token);
}

// ---------- helpers ----------
const fail = (res, code, msg) => res.status(code).json({ error: msg });
const str = (v, max = 64) => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;
const CIDR_RE = /^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/;

const isAdmin = (u) => u.role === 'admin';
const memberOf = (userId, projectId) => db.memberships.find((m) => m.userId === userId && m.projectId === projectId);
const findProject = (id) => db.projects.find((p) => p.id === id);
// Admins can reach every project. Other users need a membership in a project that is enabled.
const canAccessProject = (user, projectId) => {
  if (isAdmin(user)) return true;
  const p = findProject(projectId);
  return !!memberOf(user.id, projectId) && !!p && p.enabled;
};
// Project reader is read-only: writes need the project role admin or member.
const canWriteProject = (user, projectId) => {
  if (isAdmin(user)) return true;
  const m = memberOf(user.id, projectId);
  return canAccessProject(user, projectId) && !!m && (m.role === 'admin' || m.role === 'member');
};
function requireWrite(req, res, projectId) {
  if (canWriteProject(req.user, projectId)) return true;
  fail(res, 403, 'Your role in this project is read-only');
  return false;
}

// Pages a list. Default and maximum page size is 2000, as in the original StarlingX fault API (limit_max).
function paged(req, list) {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 2000, 1), 2000);
  let start = 0;
  if (req.query.marker) {
    const idx = list.findIndex((x) => x.id === req.query.marker);
    start = idx === -1 ? list.length : idx + 1;
  }
  const items = list.slice(start, start + limit);
  const more = start + limit < list.length;
  return { items, next: more ? items[items.length - 1].id : null };
}

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    enabled: u.enabled,
    createdAt: u.createdAt,
    projectCount: db.memberships.filter((m) => m.userId === u.id).length,
  };
}

function projectView(p) {
  return {
    ...p,
    memberCount: db.memberships.filter((m) => m.projectId === p.id).length,
    instanceCount: db.instances.filter((i) => i.projectId === p.id).length,
    volumeCount: db.volumes.filter((v) => v.projectId === p.id).length,
    networkCount: db.networks.filter((n) => n.projectId === p.id).length,
  };
}

function instanceView(i) {
  const volumes = db.volumes.filter((v) => v.attachedTo === i.id).map((v) => ({ id: v.id, name: v.name }));
  return { ...i, volumes };
}

function volumeView(v) {
  const inst = v.attachedTo ? db.instances.find((i) => i.id === v.attachedTo) : null;
  return { ...v, attachedName: inst ? inst.name : null };
}

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const s = token && sessions.get(token);
  if (s && s.expiresAt <= Date.now()) {
    sessions.delete(token);
    return fail(res, 401, 'Session expired, please sign in again');
  }
  const user = s && db.users.find((u) => u.id === s.userId);
  if (!user || !user.enabled) return fail(res, 401, 'Authentication required');
  req.user = user;
  req.token = token;
  next();
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) return fail(res, 403, 'Admin role required');
  next();
}

// Each lookup sends the error response itself and returns null on failure.
function loadProject(req, res) {
  const p = findProject(req.params.id);
  if (!p) {
    fail(res, 404, 'Project not found');
    return null;
  }
  if (!canAccessProject(req.user, p.id)) {
    fail(res, 403, 'You are not a member of this project');
    return null;
  }
  return p;
}

function instanceFor(req, res) {
  const inst = db.instances.find((i) => i.id === req.params.id);
  if (!inst) {
    fail(res, 404, 'Instance not found');
    return null;
  }
  if (!canAccessProject(req.user, inst.projectId)) {
    fail(res, 403, 'You are not a member of this project');
    return null;
  }
  return inst;
}

function volumeFor(req, res) {
  const vol = db.volumes.find((v) => v.id === req.params.id);
  if (!vol) {
    fail(res, 404, 'Volume not found');
    return null;
  }
  if (!canAccessProject(req.user, vol.projectId)) {
    fail(res, 403, 'You are not a member of this project');
    return null;
  }
  return vol;
}

// ---------- health ----------
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'starlingx-horizon-demo' }));

// ---------- auth ----------
app.post('/api/auth/login', (req, res) => {
  const email = str(req.body && req.body.email, 200);
  const password = typeof (req.body && req.body.password) === 'string' ? req.body.password : '';
  const user = email && db.users.find((u) => u.email === email.toLowerCase());
  if (!user || !user.enabled) return fail(res, 401, 'Invalid email or password');
  const given = Buffer.from(hashPassword(password, user.salt), 'hex');
  const stored = Buffer.from(user.passwordHash, 'hex');
  if (given.length !== stored.length || !crypto.timingSafeEqual(given, stored)) {
    return fail(res, 401, 'Invalid email or password');
  }
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { userId: user.id, expiresAt: Date.now() + SESSION_TIMEOUT_MS });
  res.json({ token, user: publicUser(user) });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  sessions.delete(req.token);
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

app.get('/api/overview', requireAuth, (req, res) => {
  const visible = db.projects.filter((p) => canAccessProject(req.user, p.id)).map(projectView);
  const out = { projects: visible };
  if (isAdmin(req.user)) {
    out.stats = {
      projects: db.projects.length,
      users: db.users.length,
      instances: db.instances.length,
      activeInstances: db.instances.filter((i) => i.status === 'ACTIVE').length,
      volumes: db.volumes.length,
      networks: db.networks.length,
      hosts: db.hosts.length,
      activeAlarms: db.alarms.filter((a) => a.state === 'active').length,
    };
  }
  res.json(out);
});

// ---------- projects ----------
app.get('/api/projects', requireAuth, (req, res) => {
  const list = db.projects.filter((p) => canAccessProject(req.user, p.id)).map(projectView);
  const { items, next } = paged(req, list);
  res.json({ projects: items, next });
});

app.post('/api/projects', requireAuth, requireAdmin, (req, res) => {
  const name = str(req.body.name, 64);
  if (!name || !NAME_RE.test(name)) return fail(res, 400, 'Name must be 2-64 characters: letters, digits, dot, dash or underscore');
  if (db.projects.some((p) => p.name.toLowerCase() === name.toLowerCase())) return fail(res, 409, 'A project with this name already exists');
  const project = {
    id: crypto.randomUUID(),
    name,
    description: str(req.body.description, 255) || '',
    domain: 'Default',
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  db.projects.push(project);
  res.status(201).json({ project: projectView(project) });
});

app.get('/api/projects/:id', requireAuth, (req, res) => {
  const p = loadProject(req, res);
  if (p) res.json({ project: projectView(p) });
});

app.put('/api/projects/:id', requireAuth, requireAdmin, (req, res) => {
  const p = loadProject(req, res);
  if (!p) return;
  if (req.body.name !== undefined) {
    const name = str(req.body.name, 64);
    if (!name || !NAME_RE.test(name)) return fail(res, 400, 'Invalid project name');
    if (db.projects.some((x) => x.id !== p.id && x.name.toLowerCase() === name.toLowerCase())) return fail(res, 409, 'A project with this name already exists');
    p.name = name;
  }
  if (req.body.description !== undefined) p.description = String(req.body.description).slice(0, 255);
  if (req.body.enabled !== undefined) p.enabled = Boolean(req.body.enabled);
  res.json({ project: projectView(p) });
});

app.delete('/api/projects/:id', requireAuth, requireAdmin, (req, res) => {
  const p = loadProject(req, res);
  if (!p) return;
  db.volumes = db.volumes.filter((v) => v.projectId !== p.id);
  db.instances = db.instances.filter((i) => i.projectId !== p.id);
  db.networks = db.networks.filter((n) => n.projectId !== p.id);
  db.memberships = db.memberships.filter((m) => m.projectId !== p.id);
  db.projects = db.projects.filter((x) => x.id !== p.id);
  res.json({ ok: true });
});

// ---------- project members ----------
function membersOf(projectId) {
  return db.memberships
    .filter((m) => m.projectId === projectId)
    .map((m) => {
      const u = db.users.find((x) => x.id === m.userId);
      return { userId: m.userId, name: u ? u.name : '(deleted)', email: u ? u.email : '', enabled: u ? u.enabled : false, role: m.role, addedAt: m.addedAt };
    });
}

app.get('/api/projects/:id/members', requireAuth, requireAdmin, (req, res) => {
  const p = loadProject(req, res);
  if (p) {
    const { items, next } = paged(req, membersOf(p.id).map((m) => ({ ...m, id: m.userId })));
    res.json({ members: items.map(({ id, ...m }) => m), next });
  }
});

app.post('/api/projects/:id/members', requireAuth, requireAdmin, (req, res) => {
  const p = loadProject(req, res);
  if (!p) return;
  const user = db.users.find((u) => u.id === req.body.userId);
  if (!user) return fail(res, 404, 'User not found');
  const role = ['admin', 'member', 'reader'].includes(req.body.role) ? req.body.role : 'member';
  const existing = memberOf(user.id, p.id);
  if (existing) existing.role = role;
  else db.memberships.push({ projectId: p.id, userId: user.id, role, addedAt: new Date().toISOString() });
  res.status(existing ? 200 : 201).json({ members: membersOf(p.id) });
});

app.put('/api/projects/:id/members/:userId', requireAuth, requireAdmin, (req, res) => {
  const p = loadProject(req, res);
  if (!p) return;
  const m = memberOf(req.params.userId, p.id);
  if (!m) return fail(res, 404, 'User is not a member of this project');
  if (!['admin', 'member', 'reader'].includes(req.body.role)) return fail(res, 400, 'Role must be admin, member or reader');
  m.role = req.body.role;
  res.json({ members: membersOf(p.id) });
});

app.delete('/api/projects/:id/members/:userId', requireAuth, requireAdmin, (req, res) => {
  const p = loadProject(req, res);
  if (!p) return;
  const before = db.memberships.length;
  db.memberships = db.memberships.filter((m) => !(m.projectId === p.id && m.userId === req.params.userId));
  if (db.memberships.length === before) return fail(res, 404, 'User is not a member of this project');
  res.json({ members: membersOf(p.id) });
});

// ---------- users (admin) ----------
app.get('/api/users', requireAuth, requireAdmin, (req, res) => {
  const { items, next } = paged(req, db.users.map(publicUser));
  res.json({ users: items, next });
});

app.post('/api/users', requireAuth, requireAdmin, (req, res) => {
  const name = str(req.body.name, 100);
  const email = str(req.body.email, 200);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const role = req.body.role === 'admin' ? 'admin' : 'member';
  if (!name) return fail(res, 400, 'Name is required');
  if (!email || !EMAIL_RE.test(email)) return fail(res, 400, 'A valid email is required');
  if (password.length < 8) return fail(res, 400, 'Password must be at least 8 characters');
  if (db.users.some((u) => u.email === email.toLowerCase())) return fail(res, 409, 'A user with this email already exists');
  const salt = crypto.randomBytes(16).toString('hex');
  const user = {
    id: crypto.randomUUID(),
    name,
    email: email.toLowerCase(),
    role,
    enabled: true,
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  res.status(201).json({ user: publicUser(user) });
});

app.put('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  const u = db.users.find((x) => x.id === req.params.id);
  if (!u) return fail(res, 404, 'User not found');
  const isSelf = u.id === req.user.id;
  if (req.body.name !== undefined) {
    const name = str(req.body.name, 100);
    if (!name) return fail(res, 400, 'Name is required');
    u.name = name;
  }
  if (req.body.role !== undefined) {
    if (!['admin', 'member'].includes(req.body.role)) return fail(res, 400, 'Role must be admin or member');
    if (isSelf && req.body.role !== 'admin') return fail(res, 400, 'You cannot remove your own admin role');
    u.role = req.body.role;
  }
  if (req.body.enabled !== undefined) {
    if (isSelf && !req.body.enabled) return fail(res, 400, 'You cannot disable your own account');
    u.enabled = Boolean(req.body.enabled);
  }
  if (req.body.password) {
    if (String(req.body.password).length < 8) return fail(res, 400, 'Password must be at least 8 characters');
    u.salt = crypto.randomBytes(16).toString('hex');
    u.passwordHash = hashPassword(req.body.password, u.salt);
    revokeSessionsFor(u.id); // a password change ends the user's existing sessions
  }
  res.json({ user: publicUser(u) });
});

app.delete('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  const u = db.users.find((x) => x.id === req.params.id);
  if (!u) return fail(res, 404, 'User not found');
  if (u.id === req.user.id) return fail(res, 400, 'You cannot delete your own account');
  db.users = db.users.filter((x) => x.id !== u.id);
  db.memberships = db.memberships.filter((m) => m.userId !== u.id);
  revokeSessionsFor(u.id);
  res.json({ ok: true });
});

// ---------- instances ----------
app.get('/api/projects/:id/instances', requireAuth, (req, res) => {
  const p = loadProject(req, res);
  if (p) {
    const { items, next } = paged(req, db.instances.filter((i) => i.projectId === p.id).map(instanceView));
    res.json({ instances: items, next });
  }
});

app.post('/api/projects/:id/instances', requireAuth, (req, res) => {
  const p = loadProject(req, res);
  if (!p) return;
  if (!requireWrite(req, res, p.id)) return;
  const name = str(req.body.name, 64);
  if (!name || !NAME_RE.test(name)) return fail(res, 400, 'Invalid instance name');
  const flavor = db.flavors.find((f) => f.name === req.body.flavor);
  const image = db.images.find((img) => img.name === req.body.image);
  const network = db.networks.find((n) => n.id === req.body.networkId && n.projectId === p.id);
  if (!flavor) return fail(res, 400, 'Unknown flavor');
  if (!image) return fail(res, 400, 'Unknown image');
  if (!network) return fail(res, 400, 'Select a network in this project');
  const host = db.hosts.filter((h) => h.personality === 'worker')[db.instances.length % 4];
  const inst = {
    id: crypto.randomUUID(),
    name,
    projectId: p.id,
    flavor: flavor.name,
    image: image.name,
    networkId: network.id,
    ip: network.cidr.replace(/0\/24$/, String(10 + Math.floor(Math.random() * 240))),
    host: host ? host.hostname : null,
    status: 'ACTIVE',
    keypair: str(req.body.keypair, 64) || 'key-dev',
    createdAt: new Date().toISOString(),
  };
  db.instances.push(inst);
  res.status(201).json({ instance: instanceView(inst) });
});

app.get('/api/instances/:id', requireAuth, (req, res) => {
  const inst = instanceFor(req, res);
  if (inst) res.json({ instance: instanceView(inst) });
});

const ACTIONS = {
  start: { from: ['SHUTOFF'], to: 'ACTIVE' },
  stop: { from: ['ACTIVE'], to: 'SHUTOFF' },
  reboot: { from: ['ACTIVE'], to: 'ACTIVE' },
};

app.post('/api/instances/:id/action', requireAuth, (req, res) => {
  const inst = instanceFor(req, res);
  if (!inst) return;
  if (!requireWrite(req, res, inst.projectId)) return;
  const rule = ACTIONS[req.body.action];
  if (!rule) return fail(res, 400, 'Action must be start, stop or reboot');
  if (!rule.from.includes(inst.status)) return fail(res, 409, `Cannot ${req.body.action} an instance in state ${inst.status}`);
  inst.status = rule.to;
  res.json({ instance: instanceView(inst) });
});

app.delete('/api/instances/:id', requireAuth, (req, res) => {
  const inst = instanceFor(req, res);
  if (!inst) return;
  if (!requireWrite(req, res, inst.projectId)) return;
  db.volumes.forEach((v) => {
    if (v.attachedTo === inst.id) {
      v.attachedTo = null;
      v.status = 'available';
    }
  });
  db.instances = db.instances.filter((i) => i.id !== inst.id);
  res.json({ ok: true });
});

// ---------- volumes ----------
app.get('/api/projects/:id/volumes', requireAuth, (req, res) => {
  const p = loadProject(req, res);
  if (p) {
    const { items, next } = paged(req, db.volumes.filter((v) => v.projectId === p.id).map(volumeView));
    res.json({ volumes: items, next });
  }
});

app.post('/api/projects/:id/volumes', requireAuth, (req, res) => {
  const p = loadProject(req, res);
  if (!p) return;
  if (!requireWrite(req, res, p.id)) return;
  const name = str(req.body.name, 64);
  const size = Number(req.body.size);
  if (!name || !NAME_RE.test(name)) return fail(res, 400, 'Invalid volume name');
  if (!Number.isInteger(size) || size < 1 || size > 2000) return fail(res, 400, 'Size must be a whole number from 1 to 2000 GB');
  const type = ['ceph', 'lvm', 'nfs'].includes(req.body.type) ? req.body.type : 'ceph';
  const vol = {
    id: crypto.randomUUID(),
    name,
    description: str(req.body.description, 255) || '',
    projectId: p.id,
    size,
    type,
    status: 'available',
    attachedTo: null,
    createdAt: new Date().toISOString(),
  };
  db.volumes.push(vol);
  res.status(201).json({ volume: volumeView(vol) });
});

app.post('/api/volumes/:id/attach', requireAuth, (req, res) => {
  const vol = volumeFor(req, res);
  if (!vol) return;
  if (!requireWrite(req, res, vol.projectId)) return;
  if (vol.status !== 'available') return fail(res, 409, `Volume is ${vol.status}, not available`);
  const inst = db.instances.find((i) => i.id === req.body.instanceId && i.projectId === vol.projectId);
  if (!inst) return fail(res, 400, 'Choose an instance in the same project');
  vol.attachedTo = inst.id;
  vol.status = 'in-use';
  res.json({ volume: volumeView(vol) });
});

app.post('/api/volumes/:id/detach', requireAuth, (req, res) => {
  const vol = volumeFor(req, res);
  if (!vol) return;
  if (!requireWrite(req, res, vol.projectId)) return;
  if (vol.status !== 'in-use') return fail(res, 409, 'Volume is not attached');
  vol.attachedTo = null;
  vol.status = 'available';
  res.json({ volume: volumeView(vol) });
});

app.delete('/api/volumes/:id', requireAuth, (req, res) => {
  const vol = volumeFor(req, res);
  if (!vol) return;
  if (!requireWrite(req, res, vol.projectId)) return;
  if (vol.status === 'in-use') return fail(res, 409, 'Detach the volume before deleting it');
  db.volumes = db.volumes.filter((v) => v.id !== vol.id);
  res.json({ ok: true });
});

// ---------- networks ----------
app.get('/api/projects/:id/networks', requireAuth, (req, res) => {
  const p = loadProject(req, res);
  if (p) {
    const { items, next } = paged(req, db.networks.filter((n) => n.projectId === p.id));
    res.json({ networks: items, next });
  }
});

app.post('/api/projects/:id/networks', requireAuth, (req, res) => {
  const p = loadProject(req, res);
  if (!p) return;
  if (!requireWrite(req, res, p.id)) return;
  const name = str(req.body.name, 64);
  const cidr = str(req.body.cidr, 18);
  if (!name || !NAME_RE.test(name)) return fail(res, 400, 'Invalid network name');
  if (!cidr || !CIDR_RE.test(cidr)) return fail(res, 400, 'CIDR must look like 10.0.0.0/24');
  const net = { id: crypto.randomUUID(), name, cidr, projectId: p.id, shared: false, status: 'ACTIVE', createdAt: new Date().toISOString() };
  db.networks.push(net);
  res.status(201).json({ network: net });
});

app.delete('/api/networks/:id', requireAuth, (req, res) => {
  const net = db.networks.find((n) => n.id === req.params.id);
  if (!net) return fail(res, 404, 'Network not found');
  if (!requireWrite(req, res, net.projectId)) return;
  if (db.instances.some((i) => i.networkId === net.id)) return fail(res, 409, 'Network is used by an instance');
  db.networks = db.networks.filter((n) => n.id !== net.id);
  res.json({ ok: true });
});

// ---------- catalog and platform (admin) ----------
app.get('/api/flavors', requireAuth, (req, res) => {
  const { items, next } = paged(req, db.flavors);
  res.json({ flavors: items, next });
});
app.get('/api/images', requireAuth, (req, res) => {
  const { items, next } = paged(req, db.images);
  res.json({ images: items, next });
});
app.get('/api/hosts', requireAuth, requireAdmin, (req, res) => {
  const { items, next } = paged(req, db.hosts);
  res.json({ hosts: items, next });
});

app.get('/api/alarms', requireAuth, requireAdmin, (req, res) => {
  const sev = req.query.severity;
  const list = db.alarms.filter((a) => !sev || a.severity === sev);
  const { items, next } = paged(req, list);
  res.json({ alarms: items, next });
});

app.post('/api/alarms/:id/clear', requireAuth, requireAdmin, (req, res) => {
  const a = db.alarms.find((x) => x.id === req.params.id);
  if (!a) return fail(res, 404, 'Alarm not found');
  if (a.state !== 'active') return fail(res, 409, 'Alarm is already cleared');
  a.state = 'cleared';
  res.json({ alarm: a });
});

// ---------- host inventory (admin) ----------
const HOST_SECTIONS = ['cpus', 'devices', 'filesystems', 'interfaces', 'labels', 'lldp', 'memories', 'ports', 'sensors', 'storages'];

function findHost(req, res) {
  const h = db.hosts.find((x) => x.id === req.params.id);
  if (!h) fail(res, 404, 'Host not found');
  return h || null;
}

app.get('/api/hosts/:id', requireAuth, requireAdmin, (req, res) => {
  const h = findHost(req, res);
  if (h) res.json({ host: h });
});

app.get('/api/hosts/:id/:section', requireAuth, requireAdmin, (req, res) => {
  const h = findHost(req, res);
  if (!h) return;
  if (!HOST_SECTIONS.includes(req.params.section)) return fail(res, 404, 'Unknown inventory section');
  const rows = db.hostSubs[req.params.section].filter((x) => x.hostId === h.id);
  res.json({ [req.params.section]: rows });
});

app.post('/api/hosts/:id/lock', requireAuth, requireAdmin, (req, res) => {
  const h = findHost(req, res);
  if (!h) return;
  if (h.personality === 'controller') return fail(res, 409, 'Controllers cannot be locked in this demo');
  if (h.administrative === 'locked') return fail(res, 409, 'Host is already locked');
  h.administrative = 'locked';
  h.operational = 'disabled';
  h.availability = 'online';
  res.json({ host: h });
});

app.post('/api/hosts/:id/unlock', requireAuth, requireAdmin, (req, res) => {
  const h = findHost(req, res);
  if (!h) return;
  if (h.administrative === 'unlocked') return fail(res, 409, 'Host is already unlocked');
  h.administrative = 'unlocked';
  h.operational = 'enabled';
  h.availability = 'available';
  res.json({ host: h });
});

// ---------- data networks (admin) ----------
const DATANET_TYPES = ['vlan', 'flat', 'vxlan'];

function datanetView(d) {
  return { ...d, rangeCount: d.ranges.length };
}

function findDatanet(req, res) {
  const d = db.datanets.find((x) => x.id === req.params.id);
  if (!d) fail(res, 404, 'Data network not found');
  return d || null;
}

app.get('/api/datanets', requireAuth, requireAdmin, (req, res) => {
  const { items, next } = paged(req, db.datanets.map(datanetView));
  res.json({ datanets: items, next });
});

app.post('/api/datanets', requireAuth, requireAdmin, (req, res) => {
  const name = str(req.body.name, 64);
  const mtu = Number(req.body.mtu || 1500);
  if (!name || !NAME_RE.test(name)) return fail(res, 400, 'Invalid data network name');
  if (!DATANET_TYPES.includes(req.body.network_type)) return fail(res, 400, 'Type must be vlan, flat or vxlan');
  if (!Number.isInteger(mtu) || mtu < 1280 || mtu > 9216) return fail(res, 400, 'MTU must be between 1280 and 9216');
  if (db.datanets.some((d) => d.name === name)) return fail(res, 409, 'A data network with this name already exists');
  const d = {
    id: crypto.randomUUID(), name, network_type: req.body.network_type, mtu,
    description: str(req.body.description, 255) || '', ranges: [], createdAt: new Date().toISOString(),
  };
  db.datanets.push(d);
  res.status(201).json({ datanet: datanetView(d) });
});

app.get('/api/datanets/:id', requireAuth, requireAdmin, (req, res) => {
  const d = findDatanet(req, res);
  if (d) res.json({ datanet: datanetView(d) });
});

app.delete('/api/datanets/:id', requireAuth, requireAdmin, (req, res) => {
  const d = findDatanet(req, res);
  if (!d) return;
  if (db.hostSubs.interfaces.some((i) => i.datanet === d.name)) return fail(res, 409, 'Data network is used by a host interface');
  db.datanets = db.datanets.filter((x) => x.id !== d.id);
  res.json({ ok: true });
});

app.post('/api/datanets/:id/ranges', requireAuth, requireAdmin, (req, res) => {
  const d = findDatanet(req, res);
  if (!d) return;
  const start = Number(req.body.start);
  const end = Number(req.body.end);
  const max = d.network_type === 'vlan' ? 4094 : 16777215;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > max || start > end) {
    return fail(res, 400, `Range must be whole numbers from 1 to ${max}, start not greater than end`);
  }
  if (d.network_type === 'flat') return fail(res, 409, 'Flat networks do not use ranges');
  if (d.ranges.some((r) => start <= r.end && end >= r.start)) return fail(res, 409, 'Range overlaps an existing range');
  d.ranges.push({ id: crypto.randomUUID(), start, end });
  res.status(201).json({ datanet: datanetView(d) });
});

app.delete('/api/datanets/:id/ranges/:rangeId', requireAuth, requireAdmin, (req, res) => {
  const d = findDatanet(req, res);
  if (!d) return;
  const before = d.ranges.length;
  d.ranges = d.ranges.filter((r) => r.id !== req.params.rangeId);
  if (d.ranges.length === before) return fail(res, 404, 'Range not found');
  res.json({ datanet: datanetView(d) });
});

// ---------- software management (admin) ----------
app.get('/api/software/releases', requireAuth, requireAdmin, (req, res) => {
  const { items, next } = paged(req, db.releases);
  res.json({ releases: items, next });
});
app.get('/api/software/patches', requireAuth, requireAdmin, (req, res) => {
  const { items, next } = paged(req, db.patches);
  res.json({ patches: items, next });
});

app.post('/api/software/patches/:id/apply', requireAuth, requireAdmin, (req, res) => {
  const p = db.patches.find((x) => x.id === req.params.id);
  if (!p) return fail(res, 404, 'Patch not found');
  if (p.status !== 'Available') return fail(res, 409, `Patch is ${p.status}, not Available`);
  p.status = 'Applied';
  res.json({ patch: p });
});

app.post('/api/software/patches/:id/remove', requireAuth, requireAdmin, (req, res) => {
  const p = db.patches.find((x) => x.id === req.params.id);
  if (!p) return fail(res, 404, 'Patch not found');
  if (p.status !== 'Applied') return fail(res, 409, `Patch is ${p.status}, not Applied`);
  p.status = 'Available';
  res.json({ patch: p });
});

// ---------- events (admin, read-only) ----------
app.get('/api/events', requireAuth, requireAdmin, (req, res) => {
  const sev = req.query.severity;
  const { items, next } = paged(req, db.events.filter((e) => !sev || e.severity === sev));
  res.json({ events: items, next });
});

// ---------- SPA fallback and errors ----------
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

app.use((req, res) => fail(res, 404, 'Not found'));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return fail(res, 400, 'Malformed JSON body');
  console.error(err);
  fail(res, 500, 'Internal server error');
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`StarlingX Horizon demo listening on http://localhost:${PORT}`));
}

module.exports = app;

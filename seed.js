// Deterministic seed data for the StarlingX Horizon demo.
// Same seed value on every start, so the Perfai POC sees identical data each run.
const crypto = require('crypto');

const DEMO_PASSWORD = 'Demo@123';
const SALT = 'starlingx-horizon-demo-salt';

function hashPassword(password, salt = SALT) {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

function mulberry32(seedValue) {
  let a = seedValue >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PROJECTS = [
  ['service', 'Internal services project'],
  ['demo', 'Demo and training workloads'],
  ['infra-prod', 'Production infrastructure'],
  ['infra-staging', 'Staging infrastructure'],
  ['telco-5g-core', '5G core network functions'],
  ['edge-ran', 'Edge radio access workloads'],
  ['storage-ceph', 'Ceph-backed storage services'],
  ['monitoring', 'Metrics and log collection'],
  ['ci-cd', 'Build and release pipelines'],
  ['dev-team-a', 'Team A development environments'],
  ['dev-team-b', 'Team B development environments'],
  ['finance-apps', 'Finance application hosting'],
  ['hr-portal', 'HR portal workloads'],
  ['iot-gateway', 'IoT gateway services'],
];

const FIRST = ['Ava', 'Liam', 'Noah', 'Mia', 'Eli', 'Priya', 'Sam', 'Noor', 'Lukas', 'Marco', 'Ana', 'Omar', 'Yuki', 'Ivan', 'Fatima', 'Diego', 'Chen', 'Amara', 'Sofia', 'Ravi', 'Hana', 'Kwame', 'Elena', 'Mateo', 'Leila', 'Jonas', 'Aisha', 'Tomas', 'Mei', 'Arjun', 'Zara', 'Felix', 'Ines', 'Kofi', 'Nadia', 'Oscar', 'Rosa', 'Hugo', 'Lina', 'Samir'];
const LAST = ['Chen', 'Patel', 'Khan', 'Silva', 'Rossi', 'Novak', 'Kim', 'Haddad', 'Okafor', 'Mensah', 'Ivanova', 'Schmidt', 'Dubois', 'Nakamura', 'Lopez', 'Brown', 'Garcia', 'Singh', 'Muller', 'Adeyemi', 'Rahman', 'Costa', 'Fischer', 'Yilmaz', 'Moreau', 'Larsen', 'Walsh', 'Park', 'Romero', 'Abbas'];

const FLAVORS = [
  { name: 'm1.tiny', vcpus: 1, ram: 512, disk: 1 },
  { name: 'm1.small', vcpus: 1, ram: 2048, disk: 20 },
  { name: 'm1.medium', vcpus: 2, ram: 4096, disk: 40 },
  { name: 'm1.large', vcpus: 4, ram: 8192, disk: 80 },
  { name: 'm1.xlarge', vcpus: 8, ram: 16384, disk: 160 },
  { name: 'c1.large', vcpus: 8, ram: 8192, disk: 80 },
  { name: 'r1.xlarge', vcpus: 4, ram: 32768, disk: 100 },
  { name: 'g1.small', vcpus: 4, ram: 8192, disk: 40 },
];

const IMAGES = [
  { name: 'cirros-0.6.2', size: 16, format: 'qcow2', visibility: 'public' },
  { name: 'ubuntu-22.04', size: 2350, format: 'qcow2', visibility: 'public' },
  { name: 'ubuntu-24.04', size: 2510, format: 'qcow2', visibility: 'public' },
  { name: 'centos-stream-9', size: 1870, format: 'qcow2', visibility: 'public' },
  { name: 'debian-12', size: 1640, format: 'qcow2', visibility: 'public' },
  { name: 'alpine-3.19', size: 58, format: 'qcow2', visibility: 'public' },
  { name: 'fedora-39', size: 2190, format: 'qcow2', visibility: 'public' },
  { name: 'rocky-9', size: 1920, format: 'qcow2', visibility: 'public' },
  { name: 'windows-server-2022', size: 9800, format: 'qcow2', visibility: 'private' },
  { name: 'starlingx-debian-image', size: 3100, format: 'raw', visibility: 'private' },
  { name: 'nginx-appliance-1.25', size: 740, format: 'qcow2', visibility: 'private' },
  { name: 'rhel-9.2', size: 2980, format: 'qcow2', visibility: 'private' },
];

const HOST_SPECS = [
  { hostname: 'controller-0', personality: 'controller', subfunctions: 'controller,platform' },
  { hostname: 'controller-1', personality: 'controller', subfunctions: 'controller,platform' },
  { hostname: 'worker-0', personality: 'worker', subfunctions: 'worker,compute' },
  { hostname: 'worker-1', personality: 'worker', subfunctions: 'worker,compute' },
  { hostname: 'worker-2', personality: 'worker', subfunctions: 'worker,compute' },
  { hostname: 'worker-3', personality: 'worker', subfunctions: 'worker,compute' },
  { hostname: 'storage-0', personality: 'storage', subfunctions: 'storage' },
  { hostname: 'storage-1', personality: 'storage', subfunctions: 'storage' },
];

const ALARM_TYPES = [
  { alarm_id: '100.101', severity: 'major', description: 'Platform CPU utilization above threshold' },
  { alarm_id: '100.103', severity: 'warning', description: 'Memory usage high on host' },
  { alarm_id: '200.001', severity: 'critical', description: 'Host is not responding' },
  { alarm_id: '200.004', severity: 'critical', description: 'Host has gone offline' },
  { alarm_id: '280.001', severity: 'minor', description: 'Filesystem usage above 80 percent' },
  { alarm_id: '300.001', severity: 'major', description: 'Storage backend degraded' },
  { alarm_id: '400.002', severity: 'warning', description: 'Certificate expires in less than 30 days' },
];

function seed() {
  const rnd = mulberry32(20261127);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const hex = (n) => Array.from({ length: n }, () => Math.floor(rnd() * 16).toString(16)).join('');
  const uuid = () => {
    const h = hex(32);
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
  };
  const BASE = Date.parse('2026-11-27T00:00:00Z');
  const pastDate = (daysBack) => new Date(BASE - int(0, daysBack) * 864e5 - int(0, 86399) * 1000).toISOString();

  const passwordHash = hashPassword(DEMO_PASSWORD);

  // Users: 3 admins plus 117 members.
  const users = [
    { name: 'Demo Admin', email: 'admin@starlingx-demo.example', role: 'admin' },
    { name: 'Ops Admin', email: 'ops.admin@starlingx-demo.example', role: 'admin' },
    { name: 'Platform Admin', email: 'platform.admin@starlingx-demo.example', role: 'admin' },
  ];
  for (let i = 0; i < 117; i++) {
    const first = FIRST[i % FIRST.length];
    const last = pick(LAST);
    users.push({
      name: `${first} ${last}`,
      email: `${first}.${last}${i + 1}@starlingx-demo.example`.toLowerCase(),
      role: i % 19 === 0 ? 'admin' : 'member',
    });
  }
  const userRecords = users.map((u) => ({
    id: uuid(),
    name: u.name,
    email: u.email,
    role: u.role,
    enabled: rnd() > 0.05,
    passwordHash,
    salt: SALT,
    createdAt: pastDate(400),
  }));

  const projects = PROJECTS.map(([name, description]) => ({
    id: uuid(),
    name,
    description,
    domain: 'Default',
    enabled: true,
    createdAt: pastDate(365),
  }));

  // Memberships: each member joins 1 to 4 projects with a project-level role.
  const memberships = [];
  for (const u of userRecords) {
    if (u.role === 'admin') continue;
    const count = int(1, 4);
    const shuffled = [...projects].sort(() => rnd() - 0.5).slice(0, count);
    for (const p of shuffled) {
      memberships.push({
        projectId: p.id,
        userId: u.id,
        role: pick(['member', 'member', 'member', 'reader', 'admin']),
        addedAt: pastDate(300),
      });
    }
  }

  const networks = [];
  projects.forEach((p, pIdx) => {
    const n = int(2, 4);
    for (let j = 0; j < n; j++) {
      networks.push({
        id: uuid(),
        name: `${p.name}-net-${j + 1}`,
        cidr: `10.${20 + pIdx}.${j + 1}.0/24`,
        projectId: p.id,
        shared: rnd() < 0.2,
        status: 'ACTIVE',
        createdAt: pastDate(200),
      });
    }
  });

  const hosts = HOST_SPECS.map((h, i) => {
    const isWorker = h.personality === 'worker';
    return {
      id: uuid(),
      hostname: h.hostname,
      personality: h.personality,
      subfunctions: h.subfunctions,
      administrative: 'unlocked',
      operational: 'enabled',
      availability: 'available',
      mgmt_ip: `192.168.204.${2 + i}`,
      cpus: isWorker ? pick([24, 32, 48]) : pick([16, 24]),
      memory_gb: isWorker ? pick([128, 192, 256]) : pick([64, 128]),
      status: rnd() < 0.85 ? 'ok' : 'degraded',
    };
  });
  const workers = hosts.filter((h) => h.personality === 'worker');

  const instances = [];
  for (let i = 0; i < 300; i++) {
    const project = pick(projects);
    const nets = networks.filter((n) => n.projectId === project.id);
    const net = pick(nets);
    const roll = rnd();
    const status = roll < 0.7 ? 'ACTIVE' : roll < 0.85 ? 'SHUTOFF' : roll < 0.95 ? 'ERROR' : 'ACTIVE';
    instances.push({
      id: uuid(),
      name: `${project.name}-vm-${String(i + 1).padStart(3, '0')}`,
      projectId: project.id,
      flavor: pick(FLAVORS).name,
      image: pick(IMAGES).name,
      networkId: net.id,
      ip: net.cidr.replace(/0\/24$/, String(int(10, 250))),
      host: pick(workers).hostname,
      status,
      keypair: `key-${pick(['ops', 'dev', 'ci', 'admin'])}`,
      createdAt: pastDate(180),
    });
  }

  const volumes = [];
  for (let i = 0; i < 180; i++) {
    const project = pick(projects);
    const projectInstances = instances.filter((x) => x.projectId === project.id);
    const attach = projectInstances.length > 0 && rnd() < 0.45;
    const inst = attach ? pick(projectInstances) : null;
    const error = !attach && rnd() < 0.03;
    volumes.push({
      id: uuid(),
      name: `${project.name}-vol-${String(i + 1).padStart(3, '0')}`,
      description: '',
      projectId: project.id,
      size: pick([10, 20, 50, 100, 200, 500]),
      type: pick(['ceph', 'lvm', 'nfs']),
      status: attach ? 'in-use' : error ? 'error' : 'available',
      attachedTo: inst ? inst.id : null,
      createdAt: pastDate(120),
    });
  }

  const alarms = [];
  for (let i = 0; i < 40; i++) {
    const t = pick(ALARM_TYPES);
    alarms.push({
      id: uuid(),
      alarm_id: t.alarm_id,
      severity: t.severity,
      description: t.description,
      entity: `host=${pick(hosts).hostname}`,
      state: 'active',
      timestamp: pastDate(14),
    });
  }

  return {
    users: userRecords,
    projects,
    memberships,
    networks,
    hosts,
    instances,
    volumes,
    alarms,
    flavors: FLAVORS.map((f) => ({ id: f.name, ...f })),
    images: IMAGES.map((img) => ({ id: uuid(), ...img, status: 'active', createdAt: pastDate(300) })),
  };
}

module.exports = { seed, hashPassword, DEMO_PASSWORD };

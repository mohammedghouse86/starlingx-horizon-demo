// StarlingX Horizon demo frontend. Plain JS, no build step.
(function () {
  const app = document.getElementById('app');
  let token = localStorage.getItem('sx_token');
  let me = null;
  let projects = [];

  // ---------- utilities ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (s) => (s ? new Date(s).toLocaleString() : '');
  const badge = (v) => `<span class="badge ${esc(v)}">${esc(v)}</span>`;
  const table = (headers, rows, emptyMsg) => {
    if (!rows.length) return `<div class="empty">${esc(emptyMsg || 'Nothing here yet.')}</div>`;
    return `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>` +
      `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  };
  const header = (title, buttons = '') => `<div class="bar"><h2 style="margin:0">${esc(title)}</h2><span class="spacer"></span>${buttons}</div>`;
  const opts = (list, valueKey, labelKey, selected) =>
    list.map((x) => `<option value="${esc(x[valueKey])}" ${x[valueKey] === selected ? 'selected' : ''}>${esc(x[labelKey])}</option>`).join('');
  const field = (name, label, type = 'text', extra = '') =>
    `<label class="f">${esc(label)}<input name="${name}" type="${type}" ${extra}></label>`;
  const select = (name, label, options) => `<label class="f">${esc(label)}<select name="${name}">${options}</select></label>`;

  function toast(msg, bad) {
    const t = document.createElement('div');
    t.className = 'toast' + (bad ? ' bad' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  async function api(method, path, body) {
    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/api/auth/login') {
      logout(true);
      throw new Error('Session expired, please sign in again');
    }
    if (!res.ok) throw new Error(data.error || 'Request failed (' + res.status + ')');
    return data;
  }

  function openForm(title, fieldsHtml, submit, submitLabel = 'Save') {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `<form class="modal"><h3>${esc(title)}</h3>${fieldsHtml}` +
      `<div class="err"></div><div class="actions"><button type="button" class="btn" data-close>Cancel</button>` +
      `<button class="btn primary" type="submit">${esc(submitLabel)}</button></div></form>`;
    document.body.appendChild(wrap);
    const form = wrap.querySelector('form');
    wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) wrap.remove(); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        await submit(data, form);
        wrap.remove();
        toast('Saved');
        await render();
      } catch (err) {
        wrap.querySelector('.err').textContent = err.message;
      }
    });
  }

  // ---------- session ----------
  function logout(silent) {
    if (token && !silent) api('POST', '/api/auth/logout').catch(() => {});
    token = null;
    me = null;
    projects = [];
    localStorage.removeItem('sx_token');
    location.hash = '#/login';
    render();
  }

  function currentProjectId() {
    const saved = localStorage.getItem('sx_project');
    if (saved && projects.some((p) => p.id === saved)) return saved;
    return projects[0] ? projects[0].id : null;
  }

  // ---------- login ----------
  function renderLogin() {
    app.innerHTML = `<div class="login"><h2>StarlingX Dashboard</h2>` +
      `<form id="loginForm">${field('email', 'Email', 'email', 'required autocomplete="username"')}` +
      `${field('password', 'Password', 'password', 'required autocomplete="current-password"')}` +
      `<div class="err" id="loginErr"></div><button class="btn primary" style="width:100%;padding:9px" type="submit">Sign In</button></form>` +
      `<p class="muted" style="margin-top:14px;font-size:12px">Demo environment. Use the demo accounts listed in the README.</p></div>`;
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        const out = await api('POST', '/api/auth/login', { email: f.get('email'), password: f.get('password') });
        token = out.token;
        me = out.user;
        localStorage.setItem('sx_token', token);
        location.hash = '#/overview';
        await render();
      } catch (err) {
        document.getElementById('loginErr').textContent = err.message;
      }
    });
  }

  // ---------- layout ----------
  const NAV = [
    { title: 'Project', items: [
      ['#/overview', 'Overview', 'all'],
      ['#/instances', 'Instances', 'all'],
      ['#/volumes', 'Volumes', 'all'],
      ['#/networks', 'Networks', 'all'],
      ['#/images', 'Images', 'all'],
    ] },
    { title: 'Admin', admin: true, items: [
      ['#/projects', 'Projects', 'admin'],
      ['#/users', 'Users', 'admin'],
      ['#/hosts', 'Hosts', 'admin'],
      ['#/alarms', 'Alarms', 'admin'],
    ] },
  ];

  function layout(contentHtml, activeHash) {
    const navHtml = NAV.filter((s) => !s.admin || me.role === 'admin').map((s) =>
      `<h4>${esc(s.title)}</h4>` + s.items.map(([href, label]) =>
        `<a href="${href}" class="${activeHash.startsWith(href) ? 'active' : ''}">${esc(label)}</a>`).join('')
    ).join('');
    const pid = currentProjectId();
    const projectOpts = projects.map((p) => `<option value="${esc(p.id)}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
    app.innerHTML = `<header class="top"><span class="brand">StarlingX Dashboard</span>` +
      `<label>Project <select id="projectSel">${projectOpts || '<option>No projects</option>'}</select></label>` +
      `<span class="spacer"></span><span>${esc(me.name)} (${esc(me.role)})</span>` +
      `<button class="btn small" data-act="logout">Sign out</button></header>` +
      `<div class="shell"><nav>${navHtml}</nav><main id="content">${contentHtml}</main></div>`;
  }

  // ---------- pages ----------
  const statusOf = (s) => badge(s);

  async function pgOverview() {
    const data = await api('GET', '/api/overview');
    let html = header('Overview');
    if (data.stats) {
      const s = data.stats;
      const cards = [
        ['Projects', s.projects], ['Users', s.users], ['Instances', s.instances], ['Active instances', s.activeInstances],
        ['Volumes', s.volumes], ['Networks', s.networks], ['Hosts', s.hosts], ['Active alarms', s.activeAlarms],
      ];
      html += `<div class="cards">${cards.map(([l, n]) => `<div class="card"><div class="n">${esc(n)}</div><div class="l">${esc(l)}</div></div>`).join('')}</div>`;
    }
    html += `<h2 style="font-size:15px">Your projects</h2>` + table(
      ['Project', 'Description', 'Members', 'Instances', 'Volumes', 'Networks'],
      data.projects.map((p) => [esc(p.name), esc(p.description), p.memberCount, p.instanceCount, p.volumeCount, p.networkCount]),
      'You are not a member of any project yet.'
    );
    return html;
  }

  async function pgInstances() {
    const pid = currentProjectId();
    if (!pid) return header('Instances') + `<div class="empty">No project available.</div>`;
    const { instances } = await api('GET', `/api/projects/${pid}/instances`);
    const buttons = `<button class="btn primary" data-act="inst-launch" data-pid="${pid}">Launch instance</button>`;
    const rows = instances.map((i) => {
      const ops = i.status === 'SHUTOFF' ? `<button class="btn small" data-act="inst-action" data-id="${i.id}" data-action="start">Start</button>`
        : i.status === 'ACTIVE' ? `<button class="btn small" data-act="inst-action" data-id="${i.id}" data-action="stop">Stop</button>` +
          `<button class="btn small" data-act="inst-action" data-id="${i.id}" data-action="reboot">Reboot</button>` : '';
      return [
        esc(i.name), statusOf(i.status), esc(i.ip), esc(i.image), esc(i.flavor), esc(i.host || ''),
        esc(i.volumes.map((v) => v.name).join(', ')), esc(fmtDate(i.createdAt)),
        `<span class="actions">${ops}<button class="btn small danger" data-act="inst-delete" data-id="${i.id}">Delete</button></span>`,
      ];
    });
    return header('Instances', buttons) + table(['Name', 'Status', 'IP', 'Image', 'Flavor', 'Host', 'Volumes', 'Created', 'Actions'], rows, 'No instances in this project.');
  }

  async function pgVolumes() {
    const pid = currentProjectId();
    if (!pid) return header('Volumes') + `<div class="empty">No project available.</div>`;
    const { volumes } = await api('GET', `/api/projects/${pid}/volumes`);
    const buttons = `<button class="btn primary" data-act="vol-create" data-pid="${pid}">Create volume</button>`;
    const rows = volumes.map((v) => [
      esc(v.name), esc(v.size + ' GB'), esc(v.type), statusOf(v.status), esc(v.attachedName || ''), esc(fmtDate(v.createdAt)),
      `<span class="actions">${v.status === 'available' ? `<button class="btn small" data-act="vol-attach" data-id="${v.id}" data-pid="${pid}">Attach</button>` : ''}` +
      `${v.status === 'in-use' ? `<button class="btn small" data-act="vol-detach" data-id="${v.id}">Detach</button>` : ''}` +
      `<button class="btn small danger" data-act="vol-delete" data-id="${v.id}">Delete</button></span>`,
    ]);
    return header('Volumes', buttons) + table(['Name', 'Size', 'Type', 'Status', 'Attached to', 'Created', 'Actions'], rows, 'No volumes in this project.');
  }

  async function pgNetworks() {
    const pid = currentProjectId();
    if (!pid) return header('Networks') + `<div class="empty">No project available.</div>`;
    const { networks } = await api('GET', `/api/projects/${pid}/networks`);
    const buttons = `<button class="btn primary" data-act="net-create" data-pid="${pid}">Create network</button>`;
    const rows = networks.map((n) => [
      esc(n.name), esc(n.cidr), statusOf(n.status), n.shared ? 'Yes' : 'No', esc(fmtDate(n.createdAt)),
      `<button class="btn small danger" data-act="net-delete" data-id="${n.id}">Delete</button>`,
    ]);
    return header('Networks', buttons) + table(['Name', 'CIDR', 'Status', 'Shared', 'Created', 'Actions'], rows, 'No networks in this project.');
  }

  async function pgImages() {
    const { images } = await api('GET', '/api/images');
    return header('Images') + table(['Name', 'Size (MB)', 'Format', 'Visibility', 'Status'],
      images.map((i) => [esc(i.name), esc(i.size), esc(i.format), esc(i.visibility), statusOf(i.status)]), 'No images.');
  }

  async function pgProjects() {
    const { projects: list } = await api('GET', '/api/projects');
    const buttons = `<button class="btn primary" data-act="proj-create">Create project</button>`;
    const rows = list.map((p) => [
      `<a href="#/projects/${esc(p.id)}">${esc(p.name)}</a>`, esc(p.description), p.enabled ? badge('enabled') : badge('disabled'),
      p.memberCount, p.instanceCount, p.volumeCount, p.networkCount,
      `<span class="actions"><button class="btn small" data-act="proj-toggle" data-id="${p.id}" data-enabled="${p.enabled}">${p.enabled ? 'Disable' : 'Enable'}</button>` +
      `<button class="btn small danger" data-act="proj-delete" data-id="${p.id}" data-name="${esc(p.name)}">Delete</button></span>`,
    ]);
    return header('Projects', buttons) + table(['Name', 'Description', 'Enabled', 'Members', 'Instances', 'Volumes', 'Networks', 'Actions'], rows, 'No projects.');
  }

  async function pgProjectDetail(id) {
    const { project } = await api('GET', `/api/projects/${id}`);
    const { members } = await api('GET', `/api/projects/${id}/members`);
    const kv = `<div class="kv"><div>Name</div><div>${esc(project.name)}</div><div>Description</div><div>${esc(project.description)}</div>` +
      `<div>Domain</div><div>${esc(project.domain)}</div><div>Enabled</div><div>${project.enabled ? 'Yes' : 'No'}</div>` +
      `<div>Created</div><div>${esc(fmtDate(project.createdAt))}</div></div>`;
    const buttons = `<button class="btn primary" data-act="mem-add" data-pid="${id}">Add user</button>`;
    const rows = members.map((m) => [
      esc(m.name), esc(m.email),
      `<select data-change="mem-role" data-pid="${id}" data-uid="${m.userId}">` +
        ['admin', 'member', 'reader'].map((r) => `<option value="${r}" ${r === m.role ? 'selected' : ''}>${r}</option>`).join('') + `</select>`,
      esc(fmtDate(m.addedAt)),
      `<button class="btn small danger" data-act="mem-remove" data-pid="${id}" data-uid="${m.userId}">Remove</button>`,
    ]);
    return header(`Project: ${project.name}`) + kv + header('Members', buttons) +
      table(['Name', 'Email', 'Role in project', 'Added', 'Actions'], rows, 'No members yet. Add users to give them access.');
  }

  async function pgUsers() {
    const { users } = await api('GET', '/api/users');
    const buttons = `<button class="btn primary" data-act="user-create">Create user</button>`;
    const rows = users.map((u) => [
      esc(u.name), esc(u.email), badge(u.role), u.enabled ? badge('enabled') : badge('disabled'), u.projectCount,
      `<span class="actions"><button class="btn small" data-act="user-edit" data-id="${u.id}">Edit</button>` +
      `<button class="btn small danger" data-act="user-delete" data-id="${u.id}" data-name="${esc(u.name)}">Delete</button></span>`,
    ]);
    return header('Users', buttons) + table(['Name', 'Email', 'Role', 'Status', 'Projects', 'Actions'], rows, 'No users.');
  }

  async function pgHosts() {
    const { hosts } = await api('GET', '/api/hosts');
    return header('Hosts') + table(['Hostname', 'Personality', 'Subfunctions', 'Administrative', 'Operational', 'Availability', 'Mgmt IP', 'CPUs', 'Memory (GB)', 'Status'],
      hosts.map((h) => [esc(h.hostname), esc(h.personality), esc(h.subfunctions), esc(h.administrative), esc(h.operational), esc(h.availability),
        esc(h.mgmt_ip), esc(h.cpus), esc(h.memory_gb), badge(h.status)]), 'No hosts.');
  }

  async function pgAlarms() {
    const { alarms } = await api('GET', '/api/alarms');
    const rows = alarms.map((a) => [
      badge(a.severity), esc(a.alarm_id), esc(a.description), esc(a.entity), esc(a.state), esc(fmtDate(a.timestamp)),
      a.state === 'active' ? `<button class="btn small" data-act="alarm-clear" data-id="${a.id}">Clear</button>` : '',
    ]);
    return header('Alarms') + table(['Severity', 'Alarm ID', 'Description', 'Entity', 'State', 'Raised', 'Actions'], rows, 'No alarms.');
  }

  // ---------- router ----------
  const ROUTES = {
    overview: pgOverview, instances: pgInstances, volumes: pgVolumes, networks: pgNetworks, images: pgImages,
    projects: pgProjects, users: pgUsers, hosts: pgHosts, alarms: pgAlarms,
  };
  const ADMIN_ONLY = new Set(['projects', 'users', 'hosts', 'alarms']);

  async function render() {
    if (!token) return renderLogin();
    if (!me) {
      try {
        me = (await api('GET', '/api/auth/me')).user;
      } catch (_) {
        return logout(true);
      }
    }
    if (!location.hash || location.hash === '#/login') location.hash = '#/overview';
    const hash = location.hash;
    const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const page = parts[0] || 'overview';
    try {
      projects = (await api('GET', '/api/projects')).projects;
      const pid = currentProjectId();
      if (pid) localStorage.setItem('sx_project', pid);
      let content;
      if (parts[0] === 'projects' && parts[1]) {
        if (me.role !== 'admin') content = `<div class="empty">Admin role required.</div>`;
        else content = await pgProjectDetail(parts[1]);
        layout(content, '#/projects');
      } else if (ROUTES[page]) {
        if (ADMIN_ONLY.has(page) && me.role !== 'admin') content = `<div class="empty">Admin role required.</div>`;
        else content = await ROUTES[page]();
        layout(content, '#/' + page);
      } else {
        layout(`<div class="empty">Page not found.</div>`, hash);
      }
    } catch (err) {
      toast(err.message, true);
    }
  }

  // ---------- actions (event delegation) ----------
  const ACTIONS = {
    logout: () => logout(),

    'inst-launch': async ({ pid }) => {
      const [{ flavors }, { images }, { networks }] = await Promise.all([
        api('GET', '/api/flavors'), api('GET', '/api/images'), api('GET', `/api/projects/${pid}/networks`),
      ]);
      openForm('Launch instance',
        field('name', 'Instance name', 'text', 'required pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}"') +
        select('flavor', 'Flavor', opts(flavors, 'name', 'name', 'm1.small')) +
        select('image', 'Image', opts(images, 'name', 'name', 'cirros-0.6.2')) +
        select('networkId', 'Network', opts(networks, 'id', 'name', networks[0] && networks[0].id)) +
        field('keypair', 'Key pair (optional)'),
        async (data) => {
          await api('POST', `/api/projects/${pid}/instances`, data);
        }, 'Launch');
    },
    'inst-action': async ({ id, action }) => {
      await api('POST', `/api/instances/${id}/action`, { action });
      toast('Instance ' + action + ' requested');
      await render();
    },
    'inst-delete': async ({ id }) => {
      if (!confirm('Delete this instance?')) return;
      await api('DELETE', `/api/instances/${id}`);
      toast('Instance deleted');
      await render();
    },

    'vol-create': ({ pid }) => openForm('Create volume',
      field('name', 'Volume name', 'text', 'required') +
      field('size', 'Size (GB)', 'number', 'required min="1" max="2000" value="20"') +
      select('type', 'Type', '<option>ceph</option><option>lvm</option><option>nfs</option>') +
      field('description', 'Description (optional)'),
      (data) => api('POST', `/api/projects/${pid}/volumes`, data), 'Create'),
    'vol-attach': async ({ id, pid }) => {
      const { instances } = await api('GET', `/api/projects/${pid}/instances`);
      const usable = instances.filter((i) => i.status === 'ACTIVE' || i.status === 'SHUTOFF');
      if (!usable.length) return toast('No instance available in this project to attach to', true);
      openForm('Attach volume',
        select('instanceId', 'Instance', usable.map((i) => `<option value="${esc(i.id)}">${esc(i.name)} (${esc(i.status)})</option>`).join('')),
        (data) => api('POST', `/api/volumes/${id}/attach`, data), 'Attach');
    },
    'vol-detach': async ({ id }) => {
      await api('POST', `/api/volumes/${id}/detach`);
      toast('Volume detached');
      await render();
    },
    'vol-delete': async ({ id }) => {
      if (!confirm('Delete this volume?')) return;
      await api('DELETE', `/api/volumes/${id}`);
      toast('Volume deleted');
      await render();
    },

    'net-create': ({ pid }) => openForm('Create network',
      field('name', 'Network name', 'text', 'required') +
      field('cidr', 'CIDR', 'text', 'required placeholder="10.50.1.0/24"'),
      (data) => api('POST', `/api/projects/${pid}/networks`, data), 'Create'),
    'net-delete': async ({ id }) => {
      if (!confirm('Delete this network?')) return;
      await api('DELETE', `/api/networks/${id}`);
      toast('Network deleted');
      await render();
    },

    'proj-create': () => openForm('Create project',
      field('name', 'Project name', 'text', 'required pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}"') +
      field('description', 'Description'),
      (data) => api('POST', '/api/projects', data), 'Create'),
    'proj-toggle': async ({ id, enabled }) => {
      await api('PUT', `/api/projects/${id}`, { enabled: enabled !== 'true' });
      await render();
    },
    'proj-delete': async ({ id, name }) => {
      if (!confirm(`Delete project "${name}" and all its instances, volumes and networks?`)) return;
      await api('DELETE', `/api/projects/${id}`);
      location.hash = '#/projects';
      toast('Project deleted');
      await render();
    },

    'mem-add': async ({ pid }) => {
      const { users } = await api('GET', '/api/users');
      const { members } = await api('GET', `/api/projects/${pid}/members`);
      const memberIds = new Set(members.map((m) => m.userId));
      const candidates = users.filter((u) => !memberIds.has(u.id) && u.enabled);
      if (!candidates.length) return toast('All enabled users are already members', true);
      openForm('Add user to project',
        select('userId', 'User', candidates.map((u) => `<option value="${esc(u.id)}">${esc(u.name)} (${esc(u.email)})</option>`).join('')) +
        select('role', 'Role in project', '<option value="member">member</option><option value="reader">reader</option><option value="admin">admin</option>'),
        (data) => api('POST', `/api/projects/${pid}/members`, data), 'Add');
    },
    'mem-remove': async ({ pid, uid }) => {
      if (!confirm('Remove this user from the project?')) return;
      await api('DELETE', `/api/projects/${pid}/members/${uid}`);
      toast('User removed from project');
      await render();
    },

    'user-create': () => openForm('Create user',
      field('name', 'Full name', 'text', 'required') +
      field('email', 'Email', 'email', 'required') +
      field('password', 'Initial password (min 8 characters)', 'password', 'required minlength="8"') +
      select('role', 'Role', '<option value="member">member</option><option value="admin">admin</option>'),
      (data) => api('POST', '/api/users', data), 'Create'),
    'user-edit': async ({ id }) => {
      const { users } = await api('GET', '/api/users');
      const u = users.find((x) => x.id === id);
      if (!u) return toast('User not found', true);
      openForm(`Edit ${u.name}`,
        field('name', 'Full name', 'text', `value="${esc(u.name)}" required`) +
        select('role', 'Role', `<option value="member" ${u.role === 'member' ? 'selected' : ''}>member</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>`) +
        select('enabled', 'Status', `<option value="true" ${u.enabled ? 'selected' : ''}>enabled</option><option value="false" ${!u.enabled ? 'selected' : ''}>disabled</option>`) +
        field('password', 'New password (leave blank to keep)', 'password', 'minlength="8"'),
        (data) => {
          const body = { name: data.name, role: data.role, enabled: data.enabled === 'true' };
          if (data.password) body.password = data.password;
          return api('PUT', `/api/users/${id}`, body);
        });
    },
    'user-delete': async ({ id, name }) => {
      if (!confirm(`Delete user "${name}"?`)) return;
      await api('DELETE', `/api/users/${id}`);
      toast('User deleted');
      await render();
    },

    'alarm-clear': async ({ id }) => {
      await api('POST', `/api/alarms/${id}/clear`);
      toast('Alarm cleared');
      await render();
    },
  };

  app.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const fn = ACTIONS[btn.dataset.act];
    if (!fn) return;
    try {
      await fn({ ...btn.dataset });
    } catch (err) {
      toast(err.message, true);
    }
  });

  app.addEventListener('change', async (e) => {
    if (e.target.id === 'projectSel') {
      localStorage.setItem('sx_project', e.target.value);
      return render();
    }
    if (e.target.dataset.change === 'mem-role') {
      const { pid, uid } = e.target.dataset;
      try {
        await api('PUT', `/api/projects/${pid}/members/${uid}`, { role: e.target.value });
        toast('Role updated');
      } catch (err) {
        toast(err.message, true);
        await render();
      }
    }
  });

  window.addEventListener('hashchange', () => render());
  render();
})();

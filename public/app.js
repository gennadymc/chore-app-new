const elements = {
  authContainer: document.getElementById('authContainer'),
  dashboard: document.getElementById('dashboardContainer'),
  logoutButton: document.getElementById('logoutButton'),
  loginTab: document.getElementById('loginTab'),
  registerTab: document.getElementById('registerTab'),
  loginPanel: document.getElementById('loginPanel'),
  registerPanel: document.getElementById('registerPanel'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  authMessage: document.getElementById('authMessage'),
  familyGreeting: document.getElementById('familyGreeting'),
  suggestionBox: document.getElementById('suggestionBox'),
  statList: document.getElementById('statList'),
  memberForm: document.getElementById('memberForm'),
  memberList: document.getElementById('memberList'),
  memberName: document.getElementById('memberName'),
  memberRole: document.getElementById('memberRole'),
  choreForm: document.getElementById('choreForm'),
  choreTitle: document.getElementById('choreTitle'),
  choreDescription: document.getElementById('choreDescription'),
  choreAssignee: document.getElementById('choreAssignee'),
  choreDueDate: document.getElementById('choreDueDate'),
  chorePoints: document.getElementById('chorePoints'),
  choreList: document.getElementById('choreList'),
  filterStatus: document.getElementById('filterStatus'),
  filterAssignee: document.getElementById('filterAssignee'),
  filterSearch: document.getElementById('filterSearch'),
  leaderboardBody: document.getElementById('leaderboardBody'),
  toast: document.getElementById('toast'),
};

const state = {
  token: localStorage.getItem('chore-app-token'),
  family: null,
  members: [],
  chores: [],
};

const sortMembers = (a, b) => {
  const order = { parent: 0, kid: 1 };
  const roleDiff = (order[a.role] ?? 2) - (order[b.role] ?? 2);
  if (roleDiff !== 0) return roleDiff;
  return a.name.localeCompare(b.name);
};

const SUGGESTIONS = [
  'Invite kids to pick their favorite chores and give them bonus points for enthusiasm!',
  'Celebrate wins with a Friday family treat for whoever tops the leaderboard.',
  'Pair siblings together for big chores and share the points.',
  'Rotate who chooses a weekend adventure based on the most completed chores.',
  'Encourage kids to suggest new chores they can own each week.',
];

const apiFetch = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (state.token) {
    headers.set('Authorization', `Bearer ${state.token}`);
  }

  const response = await fetch(path, { ...options, headers });
  const contentType = response.headers.get('content-type');
  const data = contentType && contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const errorMessage = data?.message || 'Something went wrong.';
    throw new Error(errorMessage);
  }

  return data;
};

const showToast = (message) => {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  elements.toast.classList.add('show');
  setTimeout(() => {
    elements.toast.classList.remove('show');
    elements.toast.hidden = true;
  }, 3200);
};

const setAuthMessage = (message, type = 'error') => {
  elements.authMessage.textContent = message;
  elements.authMessage.className = `auth__message ${type}`;
  elements.authMessage.hidden = false;
};

const clearAuthMessage = () => {
  elements.authMessage.hidden = true;
  elements.authMessage.textContent = '';
  elements.authMessage.className = 'auth__message';
};

const toggleDashboard = (showDashboard) => {
  if (showDashboard) {
    elements.authContainer.classList.add('hidden');
    elements.dashboard.classList.remove('hidden');
    elements.logoutButton.hidden = false;
  } else {
    elements.dashboard.classList.add('hidden');
    elements.authContainer.classList.remove('hidden');
    elements.logoutButton.hidden = true;
  }
};

const renderMembers = () => {
  const fragment = document.createDocumentFragment();

  state.members.forEach((member) => {
    const item = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = member.name;

    const role = document.createElement('span');
    role.className = 'member-list__role';
    role.textContent = member.role.toUpperCase();

    item.append(name, role);
    fragment.appendChild(item);
  });

  elements.memberList.replaceChildren(fragment);

  const memberOptions = [
    '<option value="">Unassigned</option>',
    ...state.members.map((member) => `<option value="${member.id}">${member.name}</option>`),
  ];
  elements.choreAssignee.innerHTML = memberOptions.join('');

  const filterOptions = [
    '<option value="all">Everyone</option>',
    ...state.members.map((member) => `<option value="${member.id}">${member.name}</option>`),
  ];
  elements.filterAssignee.innerHTML = filterOptions.join('');
};

const formatDate = (value) => {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const filteredChores = () => {
  const query = elements.filterSearch.value.trim().toLowerCase();
  const status = elements.filterStatus.value;
  const assignee = elements.filterAssignee.value;

  return state.chores.filter((chore) => {
    const matchesStatus = status === 'all' || chore.status === status;
    const matchesAssignee = assignee === 'all' || String(chore.assignedTo || '') === assignee;
    const matchesSearch =
      !query ||
      chore.title.toLowerCase().includes(query) ||
      (chore.description && chore.description.toLowerCase().includes(query));

    return matchesStatus && matchesAssignee && matchesSearch;
  });
};

const renderChores = () => {
  const template = document.getElementById('choreTemplate');
  const fragment = document.createDocumentFragment();
  const chores = filteredChores();

  if (chores.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No chores match your filters yet. Add one to get started!';
    elements.choreList.replaceChildren(empty);
    return;
  }

  chores.forEach((chore) => {
    const clone = template.content.firstElementChild.cloneNode(true);
    const title = clone.querySelector('.chore-card__title');
    const meta = clone.querySelector('.chore-card__meta');
    const description = clone.querySelector('.chore-card__description');
    const statusSelect = clone.querySelector('.chore-card__status');
    const completeButton = clone.querySelector('.mark-complete');
    const deleteButton = clone.querySelector('.delete-chore');

    const assignee = state.members.find((member) => member.id === chore.assignedTo);
    const due = chore.dueDate ? `Due ${formatDate(chore.dueDate)}` : 'No due date';
    const assigneeName = assignee ? `Assigned to ${assignee.name}` : 'Unassigned';

    title.textContent = `${chore.title} · ${chore.points ?? 0} pts`;
    meta.textContent = `${assigneeName} • ${due}`;
    description.textContent = chore.description || 'No description yet.';
    statusSelect.value = chore.status;

    statusSelect.addEventListener('change', async (event) => {
      const newStatus = event.target.value;
      try {
        await updateChore(chore.id, { ...chore, status: newStatus });
        showToast('Chore status updated');
      } catch (error) {
        showToast(error.message);
        event.target.value = chore.status;
      }
    });

    completeButton.addEventListener('click', async () => {
      try {
        await apiFetch(`/api/chores/${chore.id}/complete`, { method: 'POST' });
        const updatedChore = { ...chore, status: 'completed', completedAt: new Date().toISOString() };
        state.chores = state.chores.map((existing) => (existing.id === chore.id ? updatedChore : existing));
        renderChores();
        updateStats();
        updateLeaderboard();
        showToast('Nice work! Chore completed.');
      } catch (error) {
        showToast(error.message);
      }
    });

    deleteButton.addEventListener('click', async () => {
      const confirmed = window.confirm('Remove this chore?');
      if (!confirmed) return;
      try {
        await apiFetch(`/api/chores/${chore.id}`, { method: 'DELETE' });
        state.chores = state.chores.filter((existing) => existing.id !== chore.id);
        renderChores();
        updateStats();
        updateLeaderboard();
        showToast('Chore deleted');
      } catch (error) {
        showToast(error.message);
      }
    });

    fragment.appendChild(clone);
  });

  elements.choreList.replaceChildren(fragment);
};

const updateStats = () => {
  const total = state.chores.length;
  const completed = state.chores.filter((chore) => chore.status === 'completed').length;
  const inProgress = state.chores.filter((chore) => chore.status === 'in_progress').length;
  const overdue = state.chores.filter((chore) => {
    if (!chore.dueDate || chore.status === 'completed') return false;
    const due = new Date(chore.dueDate).setHours(23, 59, 59, 999);
    return Date.now() > due;
  }).length;

  const stats = [
    { label: 'Total chores', value: total },
    { label: 'Completed', value: completed },
    { label: 'In progress', value: inProgress },
    { label: 'Overdue', value: overdue },
  ];

  const fragment = document.createDocumentFragment();
  stats.forEach((stat) => {
    const dt = document.createElement('dt');
    dt.textContent = stat.label;
    const dd = document.createElement('dd');
    dd.textContent = stat.value;
    fragment.append(dt, dd);
  });

  elements.statList.replaceChildren(fragment);
};

const updateLeaderboard = () => {
  const leaderboard = state.members.map((member) => {
    const completedChores = state.chores.filter((chore) => chore.assignedTo === member.id && chore.status === 'completed');
    const points = completedChores.reduce((sum, chore) => sum + (chore.points ?? 0), 0);
    return {
      id: member.id,
      name: member.name,
      completed: completedChores.length,
      points,
    };
  });

  leaderboard.sort((a, b) => b.points - a.points || b.completed - a.completed || a.name.localeCompare(b.name));

  const fragment = document.createDocumentFragment();
  leaderboard.forEach((entry) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${entry.name}</td><td>${entry.completed}</td><td>${entry.points}</td>`;
    fragment.appendChild(row);
  });

  elements.leaderboardBody.replaceChildren(fragment);
};

const updateSuggestion = () => {
  const index = Math.floor(Math.random() * SUGGESTIONS.length);
  elements.suggestionBox.textContent = SUGGESTIONS[index];
};

const updateGreeting = () => {
  const name = state.family?.familyName || 'there';
  elements.familyGreeting.textContent = `Hey, ${name}!`;
};

const refreshDashboard = () => {
  renderMembers();
  renderChores();
  updateStats();
  updateLeaderboard();
  updateSuggestion();
  updateGreeting();
};

const updateChore = async (id, payload) => {
  const response = await apiFetch(`/api/chores/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: payload.title,
      description: payload.description,
      assignedTo: payload.assignedTo,
      dueDate: payload.dueDate,
      status: payload.status,
      points: payload.points,
    }),
  });
  state.chores = state.chores.map((chore) => (chore.id === id ? { ...chore, ...response } : chore));
  renderChores();
  updateStats();
  updateLeaderboard();
};

const loadDashboard = async () => {
  if (!state.token) {
    toggleDashboard(false);
    return;
  }

  try {
    const data = await apiFetch('/api/dashboard');
    state.family = data.family;
    state.members = data.members.sort(sortMembers);
    state.chores = data.chores.map((chore) => ({
      ...chore,
      status: chore.status || 'pending',
    }));
    toggleDashboard(true);
    refreshDashboard();
  } catch (error) {
    console.error(error);
    showToast('Session expired. Please log in again.');
    localStorage.removeItem('chore-app-token');
    state.token = null;
    toggleDashboard(false);
  }
};

const handleLogin = async (event) => {
  event.preventDefault();
  clearAuthMessage();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    state.token = data.token;
    state.family = data.family;
    localStorage.setItem('chore-app-token', state.token);
    toggleDashboard(true);
    await loadDashboard();
    elements.loginForm.reset();
    showToast('Logged in successfully.');
  } catch (error) {
    setAuthMessage(error.message, 'error');
  }
};

const handleRegister = async (event) => {
  event.preventDefault();
  clearAuthMessage();

  const familyName = document.getElementById('registerFamilyName').value.trim();
  const parentName = document.getElementById('registerParentName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;

  try {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ familyName, parentName, email, password }),
    });

    state.token = data.token;
    state.family = data.family;
    localStorage.setItem('chore-app-token', state.token);
    toggleDashboard(true);
    await loadDashboard();
    elements.registerForm.reset();
    showToast('Family created! Add members and chores to get started.');
  } catch (error) {
    setAuthMessage(error.message, 'error');
  }
};

const handleAddMember = async (event) => {
  event.preventDefault();
  const name = elements.memberName.value.trim();
  const role = elements.memberRole.value;

  if (!name) return;

  try {
    const member = await apiFetch('/api/members', {
      method: 'POST',
      body: JSON.stringify({ name, role }),
    });

    state.members = [...state.members, member].sort(sortMembers);
    elements.memberForm.reset();
    renderMembers();
    updateLeaderboard();
    showToast(`${member.name} joined the team!`);
  } catch (error) {
    showToast(error.message);
  }
};

const handleAddChore = async (event) => {
  event.preventDefault();
  const title = elements.choreTitle.value.trim();
  const description = elements.choreDescription.value.trim();
  const assignedTo = elements.choreAssignee.value ? Number(elements.choreAssignee.value) : null;
  const dueDate = elements.choreDueDate.value || null;
  const points = Number(elements.chorePoints.value) || 0;

  if (!title) return;

  try {
    const chore = await apiFetch('/api/chores', {
      method: 'POST',
      body: JSON.stringify({ title, description, assignedTo, dueDate, points }),
    });

    state.chores = [
      {
        ...chore,
        assignedTo,
        description,
        dueDate,
        points,
      },
      ...state.chores,
    ];
    elements.choreForm.reset();
    renderChores();
    updateStats();
    updateLeaderboard();
    showToast('Chore added!');
  } catch (error) {
    showToast(error.message);
  }
};

const handleLogout = () => {
  localStorage.removeItem('chore-app-token');
  state.token = null;
  state.family = null;
  state.members = [];
  state.chores = [];
  toggleDashboard(false);
  clearAuthMessage();
  setAuthMessage('You have been logged out.', 'success');
};

const showTab = (tab) => {
  if (tab === 'login') {
    elements.loginTab.classList.add('active');
    elements.registerTab.classList.remove('active');
    elements.loginPanel.classList.remove('hidden');
    elements.registerPanel.classList.add('hidden');
  } else {
    elements.registerTab.classList.add('active');
    elements.loginTab.classList.remove('active');
    elements.registerPanel.classList.remove('hidden');
    elements.loginPanel.classList.add('hidden');
  }
  clearAuthMessage();
};

const initializeEventListeners = () => {
  elements.loginForm?.addEventListener('submit', handleLogin);
  elements.registerForm?.addEventListener('submit', handleRegister);
  elements.memberForm?.addEventListener('submit', handleAddMember);
  elements.choreForm?.addEventListener('submit', handleAddChore);
  elements.logoutButton?.addEventListener('click', handleLogout);
  elements.loginTab?.addEventListener('click', () => showTab('login'));
  elements.registerTab?.addEventListener('click', () => showTab('register'));
  elements.filterStatus?.addEventListener('change', renderChores);
  elements.filterAssignee?.addEventListener('change', renderChores);
  elements.filterSearch?.addEventListener('input', () => {
    window.requestAnimationFrame(renderChores);
  });
};

initializeEventListeners();
loadDashboard();

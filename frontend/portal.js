(() => {
  const $ = (id) => document.getElementById(id);
  const loginScreen = $('loginScreen');
  const dashboardScreen = $('dashboardScreen');
  const form = $('loginForm');
  const button = $('loginButton');
  const error = $('loginError');
  const names = { udhayan: 'Udhayan', yogamithran: 'Yogamithran', deepasri: 'Deepasri', dhiviya: 'Dhiviya' };

  $('year').textContent = new Date().getFullYear();
  $('dashYear').textContent = new Date().getFullYear();
  const savedUsername = localStorage.getItem('nexora_username');
  if (savedUsername) { $('username').value = savedUsername; $('remember').checked = true; }

  $('togglePassword').addEventListener('click', () => {
    const input = $('password');
    const showing = input.type === 'password';
    input.type = showing ? 'text' : 'password';
    $('togglePassword').textContent = showing ? 'Hide' : 'Show';
    $('togglePassword').setAttribute('aria-label', showing ? 'Hide password' : 'Show password');
  });

  function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function showDashboard(user) {
    const username = String(user.username || '').toLowerCase();
    const displayName = user.fullName || names[username] || username;
    loginScreen.hidden = true;
    dashboardScreen.hidden = false;
    $('userName').textContent = displayName;
    $('userAvatar').textContent = displayName.charAt(0).toUpperCase();
    $('greeting').textContent = `${greeting()}, ${displayName}`;
    $('todayDate').textContent = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  }

  async function request(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Unable to complete request.');
    return data;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    const username = $('username').value.trim().toLowerCase();
    const password = $('password').value;
    button.disabled = true;
    button.querySelector('span').textContent = 'Signing in…';
    try {
      const result = await request('/api/portal/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      if ($('remember').checked) localStorage.setItem('nexora_username', username);
      else localStorage.removeItem('nexora_username');
      $('password').value = '';
      showDashboard(result.user);
    } catch (err) {
      error.textContent = err.message;
    } finally {
      button.disabled = false;
      button.querySelector('span').textContent = 'Sign in to portal';
    }
  });

  $('logoutButton').addEventListener('click', async () => {
    try { await request('/api/portal/logout', { method: 'POST', body: '{}' }); } catch (_) {}
    dashboardScreen.hidden = true;
    loginScreen.hidden = false;
    $('password').value = '';
    error.textContent = '';
  });

  request('/api/portal/me').then(({ user }) => showDashboard(user)).catch(() => {});
})();

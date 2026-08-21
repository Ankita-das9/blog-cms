// If already logged in, skip straight to dashboard
if (isLoggedIn()) {
  window.location.href = 'admin.html';
}

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorMsg = document.getElementById('errorMsg');
  errorMsg.textContent = '';

  try {
    const data = await loginRequest(username, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    localStorage.setItem('role', data.role || 'writer');
    localStorage.setItem('displayName', data.displayName || '');
    window.location.href = 'admin.html';
  } catch (err) {
    errorMsg.textContent = err.message;
  }
});

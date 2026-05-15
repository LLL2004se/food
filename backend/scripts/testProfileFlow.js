// Minimal test to validate user profile endpoints
const base = 'http://localhost:5000';

(async () => {
  const ts = Date.now();
  const email = `testuser_${ts}@example.com`;
  const password = 'Password123!';
  try {
    // Register
    let res = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email,
        password,
        user_type: 'donor'
      })
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('Register failed:', res.status, text);
      process.exit(2);
    }

    // Login
    res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        user_type: 'user'
      })
    });
    const loginData = await res.json();
    if (!res.ok || !loginData.token) {
      console.error('Login failed:', res.status, loginData);
      process.exit(3);
    }
    const token = loginData.token;

    // Fetch profile
    res = await fetch(`${base}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const profile = await res.json();
    if (!res.ok) {
      console.error('Profile fetch failed:', res.status, profile);
      process.exit(4);
    }
    if (!profile || !profile.email || profile.email.toLowerCase() !== email.toLowerCase()) {
      console.error('Unexpected profile payload:', profile);
      process.exit(5);
    }
    console.log('Profile OK:', {
      id: profile._id,
      email: profile.email,
      hasProfilePicture: Boolean(profile.profile_picture),
    });

    // Patch profile basic fields
    res = await fetch(`${base}/api/user/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        first_name: 'Test',
        last_name: 'User',
        username: `test_${ts}`,
        phone: '1234567890',
        bio: 'hello world',
        address: { building: '1', block: 'A', road: 'Main', state: 'CA' }
      })
    });
    const updated = await res.json();
    if (!res.ok) {
      console.error('Profile update failed:', res.status, updated);
      process.exit(6);
    }
    if (updated.first_name !== 'Test' || updated.username !== `test_${ts}`) {
      console.error('Update did not persist expected values:', updated);
      process.exit(7);
    }
    console.log('Profile PATCH OK:', {
      first_name: updated.first_name,
      username: updated.username
    });
    process.exit(0);
  } catch (e) {
    console.error('Test error:', e);
    process.exit(1);
  }
})();

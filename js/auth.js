/* ============================================
   GEC BHUJ - AUTH MODULE (auth.js)
   Include in: <script src="auth.js"></script>
   ============================================ */

const Auth = (function() {
    'use strict';

    const SESSION_KEY = 'gec_auth_session';
    const API_BASE = 'http://localhost:5000/api';

    // Check if user is authenticated
    function isAuthenticated() {
        const session = localStorage.getItem(SESSION_KEY);
        if (!session) return false;
        
        try {
            const data = JSON.parse(session);
            return data.expires && new Date().getTime() < data.expires;
        } catch(e) {
            return false;
        }
    }

    // Get current user data
    function getCurrentUser() {
        const session = localStorage.getItem(SESSION_KEY);
        if (!session) return null;
        
        try {
            const data = JSON.parse(session);
            if (data.expires && new Date().getTime() > data.expires) {
                logout();
                return null;
            }
            return data;
        } catch(e) {
            return null;
        }
    }

    // Login user via backend API
    async function login(username, password) {
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!res.ok) {
                const errData = await res.json();
                return { success: false, error: errData.error || 'Invalid credentials' };
            }

            const data = await res.json();
            const sessionData = {
                token: data.token,
                username: data.user.username,
                name: data.user.name,
                enrollment: data.user.enrollment || data.user.username,
                department: data.user.department,
                semester: data.user.semester,
                role: data.user.role,
                loginTime: new Date().toISOString(),
                expires: new Date().getTime() + (24 * 60 * 60 * 1000) // 24 hours
            };
            
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
            return { success: true, user: sessionData };
        } catch (err) {
            console.error('Authentication error:', err);
            return { success: false, error: 'Connection to server failed' };
        }
    }

    // Logout user
    function logout() {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = 'login.html';
    }

    // Protect route (redirect if not authenticated)
    function protect() {
        if (!isAuthenticated()) {
            window.location.replace('login.html');
        }
    }

    // Redirect if already logged in
    function redirectIfAuthenticated() {
        if (isAuthenticated()) {
            window.location.replace('dashboard.html');
        }
    }

    // Public API
    return {
        login: login,
        logout: logout,
        isAuthenticated: isAuthenticated,
        getCurrentUser: getCurrentUser,
        protect: protect,
        redirectIfAuthenticated: redirectIfAuthenticated
    };
})();

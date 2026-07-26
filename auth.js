/* ============================================
   GEC BHUJ - AUTH MODULE (auth.js)
   Place in: ee/auth.js
   Include in: <script src="auth.js"></script>
   ============================================ */

const Auth = (function() {
    'use strict';

    const SESSION_KEY = 'gec_auth_session';
    
    // Demo users (replace with API call in production)
    const USERS = [
        {
            username: '240153109018',
            password: '0000',
            name: 'Vasu Pathak',
            enrollment: '210151090018',
            department: 'Electrical Engineering',
            semester: 'Sem-6',
            role: 'student'
        },
        {
            username: '210150111002',
            password: 'student123',
            name: 'Priya Sharma',
            enrollment: '220010111002',
            department: 'Electrical Engineering',
            semester: 'Sem-6',
            role: 'student'
        },
        {
            username: 'admin',
            password: 'admin123',
            name: 'Dr. Admin User',
            enrollment: 'ADMIN001',
            department: 'Electrical Engineering',
            semester: 'N/A',
            role: 'admin'
        }
    ];

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

    // Login user
    function login(username, password) {
        const user = USERS.find(u => u.username === username && u.password === password);
        
        if (user) {
            const sessionData = {
                username: user.username,
                name: user.name,
                enrollment: user.enrollment,
                department: user.department,
                semester: user.semester,
                role: user.role,
                loginTime: new Date().toISOString(),
                expires: new Date().getTime() + (24 * 60 * 60 * 1000) // 24 hours
            };
            
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
            return { success: true, user: sessionData };
        }
        
        return { success: false, error: 'Invalid credentials' };
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
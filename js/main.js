// js/main.js - This file controls login, logout, and starts all other scripts.

const BASE_URL = 'http://localhost:3001';

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    // --- 1. LOGIN/REGISTER PAGE LOGIC ---
    if (path.includes('index.html') || path.includes('register.html') || path.endsWith('/')) {
        
        const token = localStorage.getItem('token');
        if (token) {
            // User is already logged in, check their role and redirect
            verifyTokenAndRedirect(token);
            return;
        }

        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        if (registerForm) {
            registerForm.addEventListener('submit', handleRegister);
        }
    }
    // --- 2. PROTECTED PAGE LOGIC (All other pages) ---
    else {
        // This runs on dashboard.html, teacher.html, quiz-take.html, etc.
        verifyUserSession();
    }
});

// --- AUTHENTICATION FUNCTIONS ---

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    const messageEl = document.getElementById('login-message');
    
    if (!messageEl) return;
    messageEl.textContent = 'Logging in...';
    messageEl.className = 'message message-info';

    try {
        const response = await fetch(${BASE_URL}/api/auth/login, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            localStorage.setItem('token', data.token);
            if (data.user.role === 'teacher') {
                window.location.href = 'teacher.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            messageEl.textContent = data.message || 'Login failed.';
            messageEl.className = 'message message-error';
        }
    } catch (error) {
        console.error('Login error:', error);
        messageEl.textContent = 'Network error. Please try again.';
        messageEl.className = 'message message-error';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const fullName = form.fullName.value;
    const email = form.email.value;
    const password = form.password.value;
    const role = form.role.value;
    const messageEl = document.getElementById('register-message');

    if (!messageEl) return;
    messageEl.textContent = 'Registering...';
    messageEl.className = 'message message-info';
    
    try {
        const response = await fetch(${BASE_URL}/api/auth/register, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, password, role })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            messageEl.textContent = 'Registration successful! Redirecting to login...';
            messageEl.className = 'message message-success';
            form.reset();
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            messageEl.textContent = data.message || 'Registration failed.';
            messageEl.className = 'message message-error';
        }
    } catch (error) {
        console.error('Register error:', error);
        messageEl.textContent = 'Network error. Please try again.';
        messageEl.className = 'message message-error';
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

// --- SESSION VERIFICATION ---

// This function is for the login page, to redirect already-logged-in users
async function verifyTokenAndRedirect(token) {
    try {
        const response = await fetch(${BASE_URL}/api/auth/verify, {
            headers: { 'Authorization': Bearer ${token} }
        });
        const data = await response.json();
        if (response.ok && data.success) {
             if (data.user.role === 'teacher') {
                window.location.href = 'teacher.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            localStorage.removeItem('token');
        }
    } catch (error) {
         localStorage.removeItem('token');
    }
}


// This function is for all OTHER pages, to protect them
async function verifyUserSession() {
    const token = localStorage.getItem('token');
    if (!token) {
        handleLogout(); // No token, send to login
        return;
    }
    
    try {
        const response = await fetch(${BASE_URL}/api/auth/verify, {
            headers: { 'Authorization': Bearer ${token} }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            const user = data.user;
            const path = window.location.pathname;

            // 1. Role-based Page Protection
            if (user.role === 'teacher' && (path.includes('dashboard.html') || path.includes('quiz-take.html'))) {
                window.location.href = 'teacher.html'; // Teacher on student page
                return;
            }
            if (user.role === 'student' && (path.includes('teacher.html') || path.includes('quiz-create.html'))) {
                window.location.href = 'dashboard.html'; // Student on teacher page
                return;
            }
            
            // 2. Setup Common Elements (Welcome Msg, Logout)
            setupCommonPageElements(user.fullName);
            
            // 3. START THE CORRECT SCRIPT FOR THE CURRENT PAGE
            // We check if the init function exists before calling it.
            if (path.includes('dashboard.html') && typeof window.initDashboardLogic === 'function') {
                window.initDashboardLogic(user.role, user.fullName);
            } 
            else if (path.includes('teacher.html') && typeof window.initTeacherLogic === 'function') {
                window.initTeacherLogic(user.role, user.fullName);
            } 
            else if (path.includes('quiz-create.html') && typeof window.initQuizCreateLogic === 'function') {
                window.initQuizCreateLogic(token);
            } 
            else if (path.includes('quiz-take.html') && typeof window.initQuizTakeLogic === 'function') {
                window.initQuizTakeLogic(token);
            }
            
        } else {
            handleLogout(); // Token is invalid or expired
        }
    } catch (error) {
        console.error('Session verification failed:', error);
        handleLogout(); // Network error
    }
}

function setupCommonPageElements(fullName) {
    const logoutButton = document.getElementById('nav-logout');
    const welcomeMessage = document.getElementById('welcome-message');
    
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    if (welcomeMessage) {
        welcomeMessage.textContent = Welcome, ${fullName}!;
    }
}
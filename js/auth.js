// This file contains the JavaScript logic for handling user authentication.

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 3 * 60 * 1000; // 3 minutes in milliseconds
const CAPTCHA_THRESHOLD = 3; // Show CAPTCHA after 3 failed attempts
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

let inactivityTimer;

document.addEventListener('DOMContentLoaded', function() {
    // Get all forms and sections
    const loginSection = document.getElementById('login-section');
    const signupSection = document.getElementById('signup-section');
    const resetSection = document.getElementById('reset-section');
    
    // Get all forms
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const resetPasswordForm = document.getElementById('reset-password-form');

    // Show error function
    function showError(input, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        input.parentNode.appendChild(errorDiv);
        input.classList.add('invalid-input');

        setTimeout(() => {
            errorDiv.remove();
            input.classList.remove('invalid-input');
        }, 3000);
    }

    // Show section function
    function showSection(sectionId) {
        document.querySelectorAll('.auth-section').forEach(section => {
            section.classList.remove('active');
            section.classList.add('hidden');
        });
        const section = document.getElementById(sectionId);
        section.classList.remove('hidden');
        section.classList.add('active');
    }

    // Navigation event listeners
    document.getElementById('show-signup').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('signup-section');
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('login-section');
    });

    // Add this with your other event listeners
    document.getElementById('show-reset').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('reset-section');
    });

    document.getElementById('back-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('login-section');
    });

    // Password toggle functionality
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const passwordInput = this.previousElementSibling;
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Change the eye icon
            this.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
        });
    });

    // Add role selection handling
    const roleButtons = document.querySelectorAll('.role-btn');
    let selectedRole = null;

    roleButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons in the same section
            const section = this.closest('.auth-section');
            section.querySelectorAll('.role-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            this.classList.add('active');
            selectedRole = this.dataset.role;
        });
    });

    // Login form handler
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = this.username.value;
        const rateData = getRateLimitData(username);

        // Check if CAPTCHA is required
        if (rateData.attempts >= CAPTCHA_THRESHOLD) {
            document.getElementById('recaptcha-container').style.display = 'block';
            if (!validateCaptcha()) {
                return;
            }
        }

        const section = this.closest('.auth-section');
        const role = section.querySelector('.role-btn.active')?.dataset.role;

        // Check if user is locked out
        const lockoutStatus = isUserLockedOut(username);
        if (lockoutStatus.locked) {
            showError(
                this.username, 
                `Account is temporarily locked. Please try again in ${Math.ceil(lockoutStatus.remainingSeconds / 60)} minutes.`
            );
            return;
        }

        if (!role) {
            showError(this.username, 'Please select a role');
            return;
        }

        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => 
                (u.username === username || u.email === username) && 
                u.password === this.password.value &&
                u.role === role
            );

            if (!user) {
                // Handle failed login attempt
                rateData.attempts += 1;

                if (rateData.attempts >= MAX_LOGIN_ATTEMPTS) {
                    rateData.lockoutUntil = new Date().getTime() + LOCKOUT_DURATION;
                    updateRateLimitData(username, rateData);
                    showError(
                        this.username, 
                        `Too many failed attempts. Account locked for ${LOCKOUT_DURATION/60000} minutes.`
                    );
                    return;
                }

                // Show CAPTCHA after threshold
                if (rateData.attempts >= CAPTCHA_THRESHOLD) {
                    document.getElementById('recaptcha-container').style.display = 'block';
                    rateData.requiresCaptcha = true;
                }

                updateRateLimitData(username, rateData);
                const remainingAttempts = MAX_LOGIN_ATTEMPTS - rateData.attempts;
                throw new Error(`Invalid credentials. ${remainingAttempts} attempts remaining.`);
            }

            // Successful login
            rateData.attempts = 0;
            rateData.requiresCaptcha = false;
            updateRateLimitData(username, rateData);
            
            // Reset CAPTCHA
            document.getElementById('recaptcha-container').style.display = 'none';
            if (typeof grecaptcha !== 'undefined') {
                grecaptcha.reset();
            }

            // Store user data in localStorage
            localStorage.setItem('currentUser', JSON.stringify({
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }));

            showSuccess('Login successful!');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            showError(this.username, error.message);
        }
    });

    // Signup form handler
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const section = this.closest('.auth-section');
        const role = section.querySelector('.role-btn.active')?.dataset.role;
        const password = this.password.value;

        if (!role) {
            showError(this.email, 'Please select a role');
            return;
        }

        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            showError(this.password, passwordValidation.errors.join('\n'));
            return;
        }

        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            
            if (users.some(u => u.email === this.email.value)) {
                throw new Error('Email already registered');
            }

            const newUser = {
                id: generateUserId(),
                username: this.name.value,
                email: this.email.value,
                password: password,
                role: role,
                createdAt: new Date().toISOString()
            };

            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));

            localStorage.setItem('currentUser', JSON.stringify({
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            }));

            showSuccess('Registration successful!');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);

        } catch (error) {
            showError(this.email, error.message);
        }
    });

    // Helper functions
    function generateUserId() {
        return Math.random().toString(36).substr(2, 9);
    }

    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        document.querySelector('.auth-container').appendChild(successDiv);

        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    function checkAuthStatus() {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            window.location.href = 'index.html';
        }
    }

    function validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        const errors = [];
        
        if (password.length < minLength) {
            errors.push(`Password must be at least ${minLength} characters long`);
        }
        if (!hasUpperCase) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!hasLowerCase) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!hasSpecialChar) {
            errors.push('Password must contain at least one special character');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    function getRateLimitData(username) {
        const rateLimitData = JSON.parse(localStorage.getItem('rateLimitData') || '{}');
        return rateLimitData[username] || { attempts: 0, lockoutUntil: null, requiresCaptcha: false };
    }

    function updateRateLimitData(username, data) {
        const rateLimitData = JSON.parse(localStorage.getItem('rateLimitData') || '{}');
        rateLimitData[username] = data;
        localStorage.setItem('rateLimitData', JSON.stringify(rateLimitData));
    }

    function isUserLockedOut(username) {
        const data = getRateLimitData(username);
        if (data.lockoutUntil && new Date().getTime() < data.lockoutUntil) {
            const remainingTime = Math.ceil((data.lockoutUntil - new Date().getTime()) / 1000);
            return {
                locked: true,
                remainingSeconds: remainingTime
            };
        }
        return { locked: false };
    }

    // Add captcha validation function
    function validateCaptcha() {
        if (typeof grecaptcha === 'undefined') {
            console.warn('reCAPTCHA not loaded');
            return true; // Allow login if CAPTCHA isn't loaded
        }
        const response = grecaptcha.getResponse();
        if (response.length === 0) {
            showError(document.getElementById('username'), 'Please complete the CAPTCHA');
            return false;
        }
        return true;
    }

    // Add captcha success callback
    window.onCaptchaSuccess = function() {
        // Enable login button when CAPTCHA is solved
        document.querySelector('#login-form button[type="submit"]').disabled = false;
    };

    // Initialize
    checkAuthStatus();

    // Add these functions inside the DOMContentLoaded listener
    window.onload = function() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        // Check if we're on the index page
        if (document.getElementById('user-name')) {
            const user = JSON.parse(currentUser);
            document.getElementById('user-name').textContent = user.username;
            document.getElementById('user-email').textContent = user.email;
            document.getElementById('last-login').textContent = new Date().toLocaleString();

            // Setup inactivity check
            setupInactivityCheck();
        }
    }

    function logout() {
        // Clear all session data
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('lastActivity');
        clearTimeout(inactivityTimer);
        
        // Redirect to login page
        window.location.href = 'login.html';
    }

    // Call window.onload immediately
    window.onload();
});

// Add this function after the existing helper functions
function setupInactivityCheck() {
    // Reset timer on any user activity
    const resetTimer = () => {
        clearTimeout(inactivityTimer);
        // Store last activity timestamp
        localStorage.setItem('lastActivity', new Date().getTime());
        
        inactivityTimer = setTimeout(() => {
            logout();
        }, INACTIVITY_TIMEOUT);
    };

    // Check if user should be logged out due to inactivity
    const checkInactivity = () => {
        const lastActivity = parseInt(localStorage.getItem('lastActivity'));
        if (lastActivity && (new Date().getTime() - lastActivity > INACTIVITY_TIMEOUT)) {
            logout();
        } else {
            resetTimer();
        }
    };

    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
        document.addEventListener(event, resetTimer, true);
    });

    // Initial setup
    resetTimer();

    // Check inactivity on page load
    checkInactivity();
}
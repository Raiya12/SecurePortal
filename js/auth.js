// This file contains the JavaScript logic for handling user authentication.

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
        
        const section = this.closest('.auth-section');
        const role = section.querySelector('.role-btn.active')?.dataset.role;

        if (!role) {
            showError(this.username, 'Please select a role');
            return;
        }

        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => 
                (u.username === this.username.value || u.email === this.username.value) && 
                u.password === this.password.value &&
                u.role === role
            );

            if (!user) {
                throw new Error('Invalid credentials or role');
            }

            // Store user data in localStorage
            localStorage.setItem('currentUser', JSON.stringify({
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }));

            showSuccess('Login successful!');
            // Redirect to index.html after successful login
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

    // Initialize
    checkAuthStatus();
});
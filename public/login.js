document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        // Clear previous errors
        errorMessage.classList.remove('show');
        errorMessage.textContent = '';

        if (!username || !password) {
            showError('Please enter both username and password');
            return;
        }

        // Disable submit button
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Redirect to dashboard
                window.location.href = '/dashboard';
            } else {
                showError(data.error || 'Invalid username or password');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('An error occurred. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
    }
});


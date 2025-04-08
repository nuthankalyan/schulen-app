import React, { useState, useEffect } from 'react';
import './Login.css';
import { useNavigate } from 'react-router-dom';
import config from '../config';

export const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [focusedInput, setFocusedInput] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Clear any previous errors when inputs change
        if (formError) setFormError('');
    }, [username, password]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setFormError('');

        try {
            const response = await fetch(`${config.API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Success animation
                const loginButton = e.target.querySelector('.login-button');
                loginButton.classList.add('success');
                
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', username);
                
                // Delay navigation to show success animation
                setTimeout(() => {
                    navigate('/main/myprojects');
                }, 1000);
            } else {
                setFormError(data.message || 'Login failed. Please check your credentials.');
                const form = e.target;
                form.classList.add('shake');
                setTimeout(() => form.classList.remove('shake'), 500);
            }
        } catch (error) {
            setFormError('Network error. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-split">
                <div className="login-illustration">
                    <div className="illustration-wrapper">
                        <div className="floating-shapes">
                            <div className="shape shape-1"></div>
                            <div className="shape shape-2"></div>
                            <div className="shape shape-3"></div>
                        </div>
                        <div className="illustration-text">
                            <h2>Welcome to Schulen</h2>
                            <p>Connect, Learn, Grow</p>
                        </div>
                    </div>
                </div>
                
                <div className="login-form-section">
                    <div className="login-box">
                        <div className="login-header">
                            <h1>Sign In</h1>
                            <p>Welcome back! Please enter your details</p>
                        </div>
                        
                        {formError && (
                            <div className="error-message">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleLogin} noValidate>
                            <div className="form-group">
                                <label htmlFor="username" className={focusedInput === 'username' ? 'focused' : ''}>
                                    Username
                                </label>
                                <div className={`input-wrapper ${focusedInput === 'username' ? 'focused' : ''}`}>
                                    <input
                                        type="text"
                                        id="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        onFocus={() => setFocusedInput('username')}
                                        onBlur={() => setFocusedInput(null)}
                                        placeholder="Enter your username"
                                        required
                                    />
                                    <span className="input-highlight"></span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="password" className={focusedInput === 'password' ? 'focused' : ''}>
                                    Password
                                </label>
                                <div className={`input-wrapper ${focusedInput === 'password' ? 'focused' : ''}`}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setFocusedInput('password')}
                                        onBlur={() => setFocusedInput(null)}
                                        placeholder="Enter password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                    <span className="input-highlight"></span>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button 
                                    type="submit" 
                                    className={`login-button ${isLoading ? 'loading' : ''}`}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <span className="loader"></span>
                                    ) : (
                                        'Sign In'
                                    )}
                                </button>
                                
                                <div className="additional-actions">
                                    <p className="signup-prompt">
                                        Don't have an account? 
                                        <button 
                                            type="button" 
                                            className="signup-link"
                                            onClick={() => navigate('/signup')}
                                        >
                                            Sign up
                                        </button>
                                    </p>
                                    <button 
                                        type="button" 
                                        className="forgot-password"
                                        onClick={() => navigate('/forgot-password')}
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
/**
 * LoginPage.tsx — Login & Register form with OTP verification
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../store/authSlice';
import type { AppDispatch, RootState } from '../store';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error, token } = useSelector((s: RootState) => s.auth);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Navigate to dashboard after successful login
  useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOTP = async () => {
    if (!email) {
      setOtpError('Please enter your email first');
      return;
    }

    // For register, check all fields
    if (mode === 'register' && (!name || !password)) {
      setOtpError('Please fill in all fields first');
      return;
    }

    setSendingOtp(true);
    setOtpError('');
    setOtpSuccess('');

    try {
      await axios.post(`${API}/auth/send-otp`, {
        email,
        purpose: mode === 'register' ? 'registration' : 'login',
      });

      setOtpSent(true);
      setOtpSuccess('OTP sent to your email! Check your inbox.');
      setCountdown(60); // 60 seconds cooldown
    } catch (err: any) {
      setOtpError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'login') {
      // Login without OTP
      dispatch(login({ email, password }));
    } else {
      // Register with OTP
      if (!otpSent) {
        setOtpError('Please request OTP first');
        return;
      }

      if (!otp || otp.length !== 6) {
        setOtpError('Please enter a valid 6-digit OTP');
        return;
      }

      dispatch(register({ email, password, name, username: username || name, otp }));
    }
  };

  const handleModeSwitch = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setOtpSent(false);
    setOtp('');
    setOtpError('');
    setOtpSuccess('');
    setCountdown(0);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="8" fill="#4285F4"/>
            <path d="M10 28V12h12l8 8v8H10z" fill="white" fillOpacity=".9"/>
            <path d="M22 12v8h8" fill="none" stroke="white" strokeWidth="1.5"/>
            <line x1="14" y1="20" x2="26" y2="20" stroke="#4285F4" strokeWidth="1.5"/>
            <line x1="14" y1="24" x2="26" y2="24" stroke="#4285F4" strokeWidth="1.5"/>
          </svg>
          <span>Docs</span>
        </div>

        <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          {mode === 'login' 
            ? 'Enter your credentials to access your account' 
            : 'Create your account with email verification'}
        </p>

        {error && <div className="auth-error">{error}</div>}
        {otpError && <div className="auth-error">{otpError}</div>}
        {otpSuccess && <div className="auth-success">{otpSuccess}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <>
              <input
                type="text"
                placeholder="Full name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={otpSent}
              />
              <input
                type="text"
                placeholder="Username (optional)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={otpSent}
              />
            </>
          )}
          
          <input
            type="email"
            placeholder="Email *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={otpSent}
          />
          
          <input
            type="password"
            placeholder="Password *"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={mode === 'register' && otpSent}
          />

          {mode === 'register' && !otpSent ? (
            <button 
              type="button" 
              onClick={handleSendOTP}
              disabled={sendingOtp || countdown > 0}
              style={{
                background: countdown > 0 ? '#ccc' : '#4285f4',
                cursor: countdown > 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {sendingOtp 
                ? '📧 Sending OTP...' 
                : countdown > 0 
                  ? `Resend OTP in ${countdown}s`
                  : '📧 Send OTP to Email'}
            </button>
          ) : mode === 'register' && otpSent ? (
            <>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP *"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                  }}
                  required
                  maxLength={6}
                  style={{
                    letterSpacing: '8px',
                    fontSize: '18px',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}
                />
                {countdown === 0 && (
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={sendingOtp}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#4285f4',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '5px 10px'
                    }}
                  >
                    Resend
                  </button>
                )}
              </div>

              <button type="submit" disabled={loading || otp.length !== 6}>
                {loading 
                  ? 'Verifying...' 
                  : '✅ Verify & Create Account'}
              </button>
            </>
          ) : (
            <button type="submit" disabled={loading}>
              {loading ? 'Signing in...' : '🔐 Sign in'}
            </button>
          )}
        </form>

        <p className="auth-toggle">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={handleModeSwitch}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        {mode === 'register' && otpSent && (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '10px' }}>
            💡 Didn't receive the OTP? Check your spam folder or wait {countdown > 0 ? `${countdown}s` : ''} to resend.
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginPage;

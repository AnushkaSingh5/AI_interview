import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiEye, FiEyeOff, FiCpu } from 'react-icons/fi';

// Define validation schema using Yup
const schema = yup.object().shape({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
});

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const result = await login(data.email, data.password);
      if (result.success) {
        toast.success('Logged in successfully');
        navigate('/dashboard');
      } else {
        toast.error(result.message || 'Login failed');
      }
    } catch (err) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5 d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <div className="w-100" style={{ maxWidth: '440px' }}>
        <div className="form-card">
          {/* Logo & Header */}
          <div className="text-center mb-4">
            <div className="d-flex align-items-center justify-content-center gap-2 mb-3 fw-bold fs-4" style={{ color: 'var(--text-dark)' }}>
              <FiCpu className="fs-3" style={{ color: 'var(--primary-purple)' }} />
              <span>InterviewAce</span>
            </div>
            <h2 className="fw-bold mb-1" style={{ fontSize: '1.75rem', letterSpacing: '-0.02em' }}>Welcome Back!</h2>
            <p className="text-muted small">Login to your account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Email field */}
            <div className="mb-3.5">
              <label className="form-label-mock">Email Address</label>
              <input
                type="email"
                className={`input-mock ${errors.email ? 'border-danger' : ''}`}
                placeholder="Enter your email"
                {...register('email')}
              />
              {errors.email && (
                <div className="text-danger mt-1 small" style={{ fontSize: '0.8rem' }}>{errors.email.message}</div>
              )}
            </div>

            {/* Password field */}
            <div className="mb-4">
              <label className="form-label-mock">Password</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`input-mock ${errors.password ? 'border-danger' : ''}`}
                  placeholder="Enter your password"
                  {...register('password')}
                />
                <span 
                  className="password-toggle-icon" 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </span>
              </div>
              {errors.password && (
                <div className="text-danger mt-1 small" style={{ fontSize: '0.8rem' }}>{errors.password.message}</div>
              )}
              
              {/* Forgot Password aligned right below password input */}
              <div className="text-end mt-2">
                <a 
                  href="#forgot" 
                  className="small text-decoration-none fw-semibold" 
                  style={{ color: 'var(--primary-purple)', fontSize: '0.8rem' }}
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info('Forgot Password feature is coming soon in future updates!');
                  }}
                >
                  Forgot Password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary-purple w-100 py-2.5 mt-2 d-flex align-items-center justify-content-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>

          {/* Redirect to register */}
          <div className="text-center mt-4">
            <p className="text-muted small mb-0">
              Don't have an account?{' '}
              <Link to="/signup" className="fw-semibold text-decoration-none" style={{ color: 'var(--primary-purple)' }}>
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

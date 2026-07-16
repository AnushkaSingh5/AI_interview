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
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password'), null], 'Passwords must match')
});

const Signup = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const result = await registerUser(data.name, data.email, data.password);
      if (result.success) {
        toast.success('Registration successful! Welcome.');
        navigate('/dashboard');
      } else {
        toast.error(result.message || 'Registration failed');
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
        <div className="form-card" style={{ padding: '2.25rem 2rem' }}>
          {/* Logo & Header */}
          <div className="text-center mb-4">
            <div className="d-flex align-items-center justify-content-center gap-2 mb-2 fw-bold fs-4" style={{ color: 'var(--text-dark)' }}>
              <FiCpu className="fs-3" style={{ color: 'var(--primary-purple)' }} />
              <span>InterviewAce</span>
            </div>
            <h2 className="fw-bold mb-1" style={{ fontSize: '1.65rem', letterSpacing: '-0.02em' }}>Create Your Account</h2>
            <p className="text-muted small">Join InterviewAce and start your journey</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Full Name */}
            <div className="mb-3">
              <label className="form-label-mock">Full Name</label>
              <input
                type="text"
                className={`input-mock ${errors.name ? 'border-danger' : ''}`}
                placeholder="Enter your full name"
                {...register('name')}
              />
              {errors.name && (
                <div className="text-danger mt-1 small" style={{ fontSize: '0.8rem' }}>{errors.name.message}</div>
              )}
            </div>

            {/* Email Address */}
            <div className="mb-3">
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

            {/* Password */}
            <div className="mb-3">
              <label className="form-label-mock">Password</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`input-mock ${errors.password ? 'border-danger' : ''}`}
                  placeholder="Create a password"
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
            </div>

            {/* Confirm Password */}
            <div className="mb-4">
              <label className="form-label-mock">Confirm Password</label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`input-mock ${errors.confirmPassword ? 'border-danger' : ''}`}
                  placeholder="Confirm your password"
                  {...register('confirmPassword')}
                />
                <span 
                  className="password-toggle-icon" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </span>
              </div>
              {errors.confirmPassword && (
                <div className="text-danger mt-1 small" style={{ fontSize: '0.8rem' }}>{errors.confirmPassword.message}</div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary-purple w-100 py-2.5 d-flex align-items-center justify-content-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Signing Up...</span>
                </>
              ) : (
                <span>Sign Up</span>
              )}
            </button>
          </form>

          {/* Redirect to login */}
          <div className="text-center mt-4">
            <p className="text-muted small mb-0">
              Already have an account?{' '}
              <Link to="/login" className="fw-semibold text-decoration-none" style={{ color: 'var(--primary-purple)' }}>
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

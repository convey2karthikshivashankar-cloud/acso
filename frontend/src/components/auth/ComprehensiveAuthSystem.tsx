import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
  mfaCode?: string;
}

interface MFASetup {
  qrCode: string;
  backupCodes: string[];
  secret: string;
}

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days
  preventReuse: number; // number of previous passwords
}

interface SessionInfo {
  id: string;
  deviceName: string;
  ipAddress: string;
  location: string;
  lastActive: Date;
  isCurrent: boolean;
}

export const ComprehensiveAuthSystem: React.FC = () => {
  const [authStep, setAuthStep] = useState<'login' | 'mfa' | 'setup-mfa' | 'password-reset'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaSetup, setMfaSetup] = useState<MFASetup | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy>({
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90,
    preventReuse: 5
  });
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<Date | null>(null);

  const loginSchema = yup.object().shape({
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().required('Password is required'),
    rememberMe: yup.boolean(),
    mfaCode: yup.string().when('$requireMFA', {
      is: true,
      then: (schema) => schema.required('MFA code is required').length(6, 'MFA code must be 6 digits')
    })
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<LoginCredentials>({
    resolver: yupResolver(loginSchema),
    context: { requireMFA: authStep === 'mfa' }
  });

  useEffect(() => {
    // Generate sample sessions
    const sampleSessions: SessionInfo[] = [
      {
        id: '1',
        deviceName: 'Chrome on Windows',
        ipAddress: '192.168.1.100',
        location: 'New York, NY',
        lastActive: new Date(),
        isCurrent: true
      },
      {
        id: '2',
        deviceName: 'Safari on iPhone',
        ipAddress: '10.0.0.50',
        location: 'New York, NY',
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isCurrent: false
      },
      {
        id: '3',
        deviceName: 'Firefox on Linux',
        ipAddress: '203.0.113.45',
        location: 'San Francisco, CA',
        lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isCurrent: false
      }
    ];
    setSessions(sampleSessions);

    // Check for lockout
    if (lockoutTime && new Date() < lockoutTime) {
      setIsLocked(true);
    } else {
      setIsLocked(false);
      setLockoutTime(null);
    }
  }, [lockoutTime]);

  const onSubmit = async (data: LoginCredentials) => {
    if (isLocked) {
      alert('Account is temporarily locked. Please try again later.');
      return;
    }

    try {
      // Simulate authentication
      if (data.email === 'admin@acso.com' && data.password === 'password123') {
        if (authStep === 'login') {
          // Check if MFA is required
          setAuthStep('mfa');
          return;
        } else if (authStep === 'mfa') {
          // Validate MFA code
          if (data.mfaCode === '123456') {
            alert('Login successful!');
            setLoginAttempts(0);
            // Redirect to dashboard
          } else {
            throw new Error('Invalid MFA code');
          }
        }
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      setLoginAttempts(prev => prev + 1);
      
      if (loginAttempts >= 4) { // 5 attempts total
        setIsLocked(true);
        setLockoutTime(new Date(Date.now() + 15 * 60 * 1000)); // 15 minutes
        alert('Account locked due to too many failed attempts. Try again in 15 minutes.');
      } else {
        alert(`Login failed. ${5 - loginAttempts - 1} attempts remaining.`);
      }
    }
  };

  const setupMFA = () => {
    // Generate MFA setup data
    const setup: MFASetup = {
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      backupCodes: [
        'ABC123DEF456',
        'GHI789JKL012',
        'MNO345PQR678',
        'STU901VWX234',
        'YZA567BCD890'
      ],
      secret: 'JBSWY3DPEHPK3PXP'
    };
    
    setMfaSetup(setup);
    setAuthStep('setup-mfa');
  };

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    
    if (password.length < passwordPolicy.minLength) {
      errors.push(`Password must be at least ${passwordPolicy.minLength} characters`);
    }
    
    if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letters');
    }
    
    if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letters');
    }
    
    if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain numbers');
    }
    
    if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain special characters');
    }
    
    return errors;
  };

  const terminateSession = (sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId));
    alert('Session terminated successfully');
  };

  const terminateAllOtherSessions = () => {
    setSessions(prev => prev.filter(session => session.isCurrent));
    alert('All other sessions terminated successfully');
  };

  const renderLoginForm = () => (
    <div className="card">
      <div className="card-header text-center">
        <h4 className="mb-0">Sign In to ACSO</h4>
        <p className="text-muted mb-0">Secure access to your cybersecurity dashboard</p>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-3">
            <label className="form-label">Email Address</label>
            <input
              {...register('email')}
              type="email"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              placeholder="Enter your email"
              disabled={isLocked}
            />
            {errors.email && (
              <div className="invalid-feedback">{errors.email.message}</div>
            )}
          </div>
          
          <div className="mb-3">
            <label className="form-label">Password</label>
            <div className="input-group">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                placeholder="Enter your password"
                disabled={isLocked}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLocked}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
              {errors.password && (
                <div className="invalid-feedback">{errors.password.message}</div>
              )}
            </div>
          </div>
          
          <div className="mb-3 form-check">
            <input
              {...register('rememberMe')}
              type="checkbox"
              className="form-check-input"
              id="rememberMe"
              disabled={isLocked}
            />
            <label className="form-check-label" htmlFor="rememberMe">
              Remember me for 30 days
            </label>
          </div>
          
          {loginAttempts > 0 && (
            <div className="alert alert-warning">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {5 - loginAttempts} login attempts remaining
            </div>
          )}
          
          {isLocked && lockoutTime && (
            <div className="alert alert-danger">
              <i className="bi bi-lock me-2"></i>
              Account locked until {lockoutTime.toLocaleTimeString()}
            </div>
          )}
          
          <button
            type="submit"
            className="btn btn-primary w-100 mb-3"
            disabled={isLocked}
          >
            {isLocked ? 'Account Locked' : 'Sign In'}
          </button>
          
          <div className="text-center">
            <button
              type="button"
              className="btn btn-link"
              onClick={() => setAuthStep('password-reset')}
            >
              Forgot your password?
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderMFAForm = () => (
    <div className="card">
      <div className="card-header text-center">
        <h4 className="mb-0">Two-Factor Authentication</h4>
        <p className="text-muted mb-0">Enter the 6-digit code from your authenticator app</p>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-3">
            <label className="form-label">Authentication Code</label>
            <input
              {...register('mfaCode')}
              type="text"
              className={`form-control text-center ${errors.mfaCode ? 'is-invalid' : ''}`}
              placeholder="000000"
              maxLength={6}
              style={{ fontSize: '1.5rem', letterSpacing: '0.5rem' }}
            />
            {errors.mfaCode && (
              <div className="invalid-feedback">{errors.mfaCode.message}</div>
            )}
          </div>
          
          <button type="submit" className="btn btn-primary w-100 mb-3">
            Verify & Sign In
          </button>
          
          <div className="text-center">
            <button
              type="button"
              className="btn btn-link"
              onClick={() => setAuthStep('login')}
            >
              Back to login
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderMFASetup = () => (
    <div className="card">
      <div className="card-header text-center">
        <h4 className="mb-0">Set Up Two-Factor Authentication</h4>
        <p className="text-muted mb-0">Secure your account with an additional layer of protection</p>
      </div>
      <div className="card-body">
        <div className="row">
          <div className="col-md-6">
            <h6>Step 1: Scan QR Code</h6>
            <div className="text-center mb-3">
              <img
                src={mfaSetup?.qrCode}
                alt="QR Code"
                className="img-fluid border"
                style={{ maxWidth: '200px' }}
              />
            </div>
            <p className="small text-muted">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            
            <h6>Manual Entry</h6>
            <div className="input-group mb-3">
              <input
                type="text"
                className="form-control"
                value={mfaSetup?.secret}
                readOnly
              />
              <button className="btn btn-outline-secondary" type="button">
                <i className="bi bi-clipboard"></i>
              </button>
            </div>
          </div>
          
          <div className="col-md-6">
            <h6>Step 2: Save Backup Codes</h6>
            <div className="alert alert-warning">
              <i className="bi bi-exclamation-triangle me-2"></i>
              Save these backup codes in a secure location. You can use them to access your account if you lose your device.
            </div>
            
            <div className="backup-codes mb-3">
              {mfaSetup?.backupCodes.map((code, index) => (
                <div key={index} className="d-flex justify-content-between align-items-center mb-1">
                  <code className="bg-light p-1">{code}</code>
                  <button className="btn btn-sm btn-outline-secondary">
                    <i className="bi bi-clipboard"></i>
                  </button>
                </div>
              ))}
            </div>
            
            <button className="btn btn-success w-100" onClick={() => setAuthStep('login')}>
              Complete Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSessionManagement = () => (
    <div className="card">
      <div className="card-header">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Active Sessions</h6>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={terminateAllOtherSessions}
          >
            Terminate All Other Sessions
          </button>
        </div>
      </div>
      <div className="card-body">
        {sessions.map(session => (
          <div key={session.id} className="d-flex justify-content-between align-items-center mb-3 p-3 border rounded">
            <div>
              <div className="d-flex align-items-center mb-1">
                <strong>{session.deviceName}</strong>
                {session.isCurrent && (
                  <span className="badge bg-success ms-2">Current Session</span>
                )}
              </div>
              <div className="small text-muted">
                <div>IP: {session.ipAddress}</div>
                <div>Location: {session.location}</div>
                <div>Last active: {session.lastActive.toLocaleString()}</div>
              </div>
            </div>
            
            {!session.isCurrent && (
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={() => terminateSession(session.id)}
              >
                Terminate
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="comprehensive-auth-system">
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-md-6">
            {authStep === 'login' && renderLoginForm()}
            {authStep === 'mfa' && renderMFAForm()}
            {authStep === 'setup-mfa' && renderMFASetup()}
          </div>
        </div>
        
        {/* Additional Security Features */}
        <div className="row mt-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Security Settings</h6>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <strong>Two-Factor Authentication</strong>
                    <div className="small text-muted">Add an extra layer of security</div>
                  </div>
                  <button className="btn btn-outline-primary btn-sm" onClick={setupMFA}>
                    Enable MFA
                  </button>
                </div>
                
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <strong>Password Policy</strong>
                    <div className="small text-muted">
                      Min {passwordPolicy.minLength} chars, expires in {passwordPolicy.maxAge} days
                    </div>
                  </div>
                  <button className="btn btn-outline-secondary btn-sm">
                    Configure
                  </button>
                </div>
                
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Single Sign-On (SSO)</strong>
                    <div className="small text-muted">Connect with your organization's SSO</div>
                  </div>
                  <button className="btn btn-outline-info btn-sm">
                    Configure SSO
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            {renderSessionManagement()}
          </div>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from "react";

export default function LoginPortal({
  formView,
  setFormView,
  loginRole,
  setLoginRole,
  signupRole,
  setSignupRole,
  onLogin,
  onSignup,
  onForgotPassword
}) {
  // Login Form Values
  const [loginEmail, setLoginEmail] = useState("akira.tanaka@toyota.in");
  const [loginPassword, setLoginPassword] = useState("admin123");

  // Signup Form Values
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupRegion, setSignupRegion] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");

  // Forgot Password Values
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirm, setForgotConfirm] = useState("");

  // Sync default login credentials on role toggle
  useEffect(() => {
    if (loginRole === "admin") {
      setLoginEmail("akira.tanaka@toyota.in");
      setLoginPassword("admin123");
    } else {
      setLoginEmail("rohan.sharma@toyota.in");
      setLoginPassword("sales123");
    }
  }, [loginRole]);

  // Signin form handler
  const handleSignIn = (e) => {
    e.preventDefault();
    onLogin(loginEmail, loginPassword, loginRole);
  };

  // Signup form handler
  const handleSignUp = (e) => {
    e.preventDefault();
    onSignup({
      name: signupName,
      email: signupEmail,
      region: signupRegion,
      password: signupPassword,
      confirm: signupConfirm,
      role: signupRole
    });
  };

  // Forgot password handler
  const handleForgot = (e) => {
    e.preventDefault();
    onForgotPassword({
      email: forgotEmail,
      newPassword: forgotNewPassword,
      confirm: forgotConfirm
    });
  };

  return (
    <div id="loginView" className="login-container">
      {/* Hero Left Panel */}
      <div className="login-left">
        <div className="login-left-content">
          <div className="logo-container white-logo">
            <span className="brand-toyota">TOYOTA</span> <span className="brand-smart">REVORA</span>
          </div>
          <div className="hero-text-area">
            <span className="tag-enterprise">INTERNAL ENTERPRISE PLATFORM</span>
            <h1>Performance in Motion</h1>
            <p>Configure slabs, track sales, and calculate payouts in real time — the way your team has always wished.</p>
          </div>
          <div className="hero-footer">
            <span>V2.4</span>
            <span>•</span>
            <span>SOC-2 COMPLIANT</span>
            <span>•</span>
            <span>IN &nbsp;•&nbsp; 2024</span>
          </div>
        </div>
      </div>

      {/* Forms Right Panel */}
      <div className="login-right">
        
        {/* CARD A: SIGN IN */}
        {formView === "login" && (
          <div className="login-form-card">
            <h2>Welcome back</h2>
            <p className="subtitle">Choose your portal to continue.</p>

            <div className="role-selector-grid">
              <div className={`role-card ${loginRole === "admin" ? "active" : ""}`} onClick={() => setLoginRole("admin")}>
                <div className="role-card-border"></div>
                <div className={`role-icon-circle ${loginRole === "admin" ? "red-bg" : "grey-bg"}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div className="role-card-info">
                  <h3>Admin Portal</h3>
                  <p>Configure & review</p>
                </div>
              </div>

              <div className={`role-card ${loginRole === "officer" ? "active" : ""}`} onClick={() => setLoginRole("officer")}>
                <div className="role-card-border"></div>
                <div className={`role-icon-circle ${loginRole === "officer" ? "red-bg" : "grey-bg"}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div className="role-card-info">
                  <h3>Sales Officer</h3>
                  <p>Enter & track</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSignIn}>
              <div className="input-group">
                <label>WORK EMAIL</label>
                <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              </div>
              <div className="input-group">
                <div className="label-row">
                  <label>PASSWORD</label>
                  <a href="#" className="forgot-link" onClick={() => setFormView("forgot")}>Forgot password?</a>
                </div>
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                <span>Continue to {loginRole === "admin" ? "Admin Portal" : "Sales Officer"}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-arrow"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </form>

            <div className="auth-navigation-prompt">
              Don't have an account? <a href="#" className="auth-toggle-link" onClick={() => setFormView("signup")}>Sign Up</a>
            </div>
            <div className="footer-notice">AUTHORISED PERSONNEL ONLY • TOYOTA KIRLOSKAR MOTOR</div>
          </div>
        )}

        {/* CARD B: SIGN UP */}
        {formView === "signup" && (
          <div className="login-form-card">
            <h2>Create Account</h2>
            <p className="subtitle">Select portal role to register as a new user.</p>

            <div className="role-selector-grid">
              <div className={`role-card ${signupRole === "admin" ? "active" : ""}`} onClick={() => setSignupRole("admin")}>
                <div className="role-card-border"></div>
                <div className={`role-icon-circle ${signupRole === "admin" ? "red-bg" : "grey-bg"}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div className="role-card-info">
                  <h3>Admin Portal</h3>
                  <p>Configure & review</p>
                </div>
              </div>

              <div className={`role-card ${signupRole === "officer" ? "active" : ""}`} onClick={() => setSignupRole("officer")}>
                <div className="role-card-border"></div>
                <div className={`role-icon-circle ${signupRole === "officer" ? "red-bg" : "grey-bg"}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div className="role-card-info">
                  <h3>Sales Officer</h3>
                  <p>Enter & track</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSignUp}>
              <div className="input-group">
                <label>FULL NAME</label>
                <input type="text" placeholder="e.g. Rohan Sharma" value={signupName} onChange={(e) => setSignupName(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>WORK EMAIL</label>
                <input type="email" placeholder="name@toyota.in" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>{signupRole === "admin" ? "ADMINISTRATOR REGION/ZONE" : "OFFICER ASSIGNED HUB & ZONE"}</label>
                <input type="text" placeholder={signupRole === "admin" ? "e.g. Region Admin • South" : "e.g. Bangalore South"} value={signupRegion} onChange={(e) => setSignupRegion(e.target.value)} required />
              </div>
              <div className="modal-row-inputs">
                <div className="input-group flex-1">
                  <label>PASSWORD</label>
                  <input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
                </div>
                <div className="input-group flex-1">
                  <label>CONFIRM</label>
                  <input type="password" value={signupConfirm} onChange={(e) => setSignupConfirm(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                <span>Register & Log In</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-arrow"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </form>

            <div className="auth-navigation-prompt">
              Already have an account? <a href="#" className="auth-toggle-link" onClick={() => setFormView("login")}>Sign In</a>
            </div>
          </div>
        )}

        {/* CARD C: FORGOT PASSWORD */}
        {formView === "forgot" && (
          <div className="login-form-card">
            <h2>Reset Password</h2>
            <p className="subtitle">Specify your email and input a new credentials policy.</p>

            <form onSubmit={handleForgot}>
              <div className="input-group">
                <label>WORK EMAIL ID</label>
                <input type="email" placeholder="name@toyota.in" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>NEW PASSWORD</label>
                <input type="password" value={forgotNewPassword} onChange={(e) => setForgotNewPassword(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>CONFIRM PASSWORD</label>
                <input type="password" value={forgotConfirm} onChange={(e) => setForgotConfirm(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                <span>Save</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="btn-arrow"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </form>

            <div className="auth-navigation-prompt">
              Remember your credentials? <a href="#" className="auth-toggle-link" onClick={() => setFormView("login")}>Sign In</a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

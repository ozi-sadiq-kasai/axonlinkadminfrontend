import AccountDeletionLink from "../AccountDeletionLink";
import { useEffect, useRef, useState } from "react";
import illustration from "./assets/admin-signin-illustration.svg";
import axonlinkMark from "./assets/axonlink-mark.svg";
import infoIcon from "./assets/info.svg";
import lockIcon from "./assets/lock.svg";
import visibilityIcon from "./assets/visibility.svg";
import setupCompleteIllustration from "./assets/setup-complete-illustration.svg";
import checkCircleIcon from "./assets/check-circle.svg";
import setupFailedIcon from "./assets/setup-failed.svg";
import {
  loginAdmin,
  requestPasswordReset,
  resetAdminPassword,
  signupAdmin,
  verifyPasswordResetCode,
} from "./authApi";

const RECOVERY_EMAIL_STORAGE_KEY = "axonlink-admin-recovery-email";
const RECOVERY_RESEND_UNTIL_STORAGE_KEY = "axonlink-admin-recovery-resend-until";
const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeRecoveryEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidRecoveryEmail(value) {
  return EMAIL_PATTERN.test(normalizeRecoveryEmail(value));
}

function readRecoveryValue(key) {
  try {
    return window.sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeRecoveryValue(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Password recovery still works when session storage is unavailable.
  }
}

function removeRecoveryValue(key) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Nothing else is required when session storage is unavailable.
  }
}

function getResendRemainingSeconds() {
  const resendUntil = Number(readRecoveryValue(RECOVERY_RESEND_UNTIL_STORAGE_KEY));
  if (!Number.isFinite(resendUntil) || resendUntil <= Date.now()) return 0;
  return Math.ceil((resendUntil - Date.now()) / 1000);
}

function beginResendCooldown() {
  const resendUntil = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
  writeRecoveryValue(RECOVERY_RESEND_UNTIL_STORAGE_KEY, String(resendUntil));
  return RESEND_COOLDOWN_SECONDS;
}

function clearRecoverySession() {
  removeRecoveryValue(RECOVERY_EMAIL_STORAGE_KEY);
  removeRecoveryValue(RECOVERY_RESEND_UNTIL_STORAGE_KEY);
}

function PasswordField({ id, label, value, onChange }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <span className="field__control">
        <img className="field__icon" src={lockIcon} alt="" />
        <input
          id={id}
          name={id}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Enter Password"
          autoComplete={id === "password" ? "new-password" : "new-password"}
        />
        <button
          className="visibility-button"
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label={`${isVisible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={isVisible}
        >
          <img src={visibilityIcon} alt="" />
        </button>
      </span>
    </label>
  );
}

function LoginScreen({ onForgotPassword, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setMessage("Enter your email address and password.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      await onLogin(email.trim(), password);
    } catch (error) {
      setMessage(error.message || "Unable to log in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="sign-in-page login-page">
      <section className="illustration-panel login-illustration" aria-label="Admin login security">
        <img src={illustration} alt="Secure administrative login illustration" />
      </section>

      <section className="form-panel login-panel">
        <form className="login-form" onSubmit={handleLogin} noValidate>
          <header className="login-heading">
            <h1>Welcome Back Admin</h1>
            <p>Administrative Log-In</p>
          </header>

          <div className="login-fields">
            <label className="field login-field" htmlFor="login-email">
              <span className="field__label">Email Address</span>
              <input
                id="login-email"
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter email address"
                autoComplete="username"
              />
            </label>

            <label className="field login-field" htmlFor="login-password">
              <span className="field__label">Password</span>
              <span className="field__control">
                <img className="field__icon" src={lockIcon} alt="" />
                <input
                  id="login-password"
                  type={isVisible ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter Password"
                  autoComplete="current-password"
                />
                <button
                  className="visibility-button"
                  type="button"
                  onClick={() => setIsVisible((visible) => !visible)}
                  aria-label={`${isVisible ? "Hide" : "Show"} password`}
                  aria-pressed={isVisible}
                >
                  <img src={visibilityIcon} alt="" />
                </button>
              </span>
            </label>
          </div>

          <button
            className="forgot-password"
            type="button"
            onClick={onForgotPassword}
          >
            Forgot Password
          </button>

          <button className="proceed-button login-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging In…" : "Log In"}
          </button>

          <p className="form-message" aria-live="polite">
            {message}
          </p>
        </form>
        <AccountDeletionLink compact />
      </section>
    </main>
  );
}

function ForgotPasswordScreen({ onBack, onContinue }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedEmail = normalizeRecoveryEmail(email);
    if (!normalizedEmail) {
      setMessage("Enter the email address linked to your administrator account.");
      return;
    }

    if (!isValidRecoveryEmail(normalizedEmail)) {
      setMessage("Enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      await onContinue(normalizedEmail);
    } catch (error) {
      setMessage(error.message || "Unable to request a password reset.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="sign-in-page recovery-page">
      <section
        className="illustration-panel recovery-illustration"
        aria-label="Password recovery security"
      >
        <img src={illustration} alt="Password recovery lock illustration" />
      </section>

      <section className="form-panel recovery-panel">
        <button className="back-button" type="button" onClick={onBack} aria-label="Back to login">
          ←
        </button>

        <form className="login-form recovery-form" onSubmit={handleSubmit} noValidate>
          <header className="recovery-heading">
            <h1>Forgot Password?</h1>
            <p>Enter the email address linked to your administrator account.</p>
          </header>

          <div className="login-fields">
            <label className="field login-field" htmlFor="recovery-email">
              <span className="field__label">Email Address</span>
              <input
                id="recovery-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter email address"
                autoComplete="username"
                autoCapitalize="none"
              />
            </label>

          </div>

          <button className="proceed-button recovery-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Proceed"}
          </button>

          <p className="form-message" aria-live="polite">
            {message}
          </p>
        </form>
      </section>
    </main>
  );
}

function VerificationScreen({ email, onBack, onVerified, onResend }) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendRemainingSeconds, setResendRemainingSeconds] = useState(() => getResendRemainingSeconds());
  const inputRefs = useRef([]);
  const hasRecoveryEmail = isValidRecoveryEmail(email);

  useEffect(() => {
    if (resendRemainingSeconds <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendRemainingSeconds(getResendRemainingSeconds());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendRemainingSeconds]);

  function updateDigit(index, value) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextCode = [...code];
    nextCode[index] = digit;
    setCode(nextCode);

    if (digit && index < nextCode.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, event) {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event) {
    const pastedCode = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pastedCode) return;

    event.preventDefault();
    const nextCode = Array.from({ length: 6 }, (_, index) => pastedCode[index] ?? "");
    setCode(nextCode);
    inputRefs.current[Math.min(pastedCode.length, 5)]?.focus();
  }

  async function handleConfirm(event) {
    event.preventDefault();

    if (!hasRecoveryEmail) {
      setMessage("Your password reset session has expired. Return to Forgot Password and request a new code.");
      return;
    }

    if (code.some((digit) => !digit)) {
      setMessage("Enter the complete six-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      await onVerified(code.join(""));
    } catch (error) {
      setMessage(error.message || "Unable to verify this code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!hasRecoveryEmail) {
      setMessage("Your password reset session has expired. Return to Forgot Password and request a new code.");
      return;
    }

    if (isResending || resendRemainingSeconds > 0) return;

    setIsResending(true);
    setMessage("");
    try {
      await onResend();
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setResendRemainingSeconds(getResendRemainingSeconds());
      setMessage("We requested a new code. If this email is linked to an active administrator account, check your inbox and spam folder.");
    } catch (error) {
      setMessage(error.message || "Unable to resend the code.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="sign-in-page verification-page">
      <section
        className="illustration-panel recovery-illustration"
        aria-label="Email verification security"
      >
        <img src={illustration} alt="Password verification lock illustration" />
      </section>

      <section className="form-panel verification-panel">
        <button className="back-button" type="button" onClick={onBack} aria-label="Back">
          ←
        </button>

        <form className="verification-form" onSubmit={handleConfirm} noValidate>
          <header className="verification-heading">
            <h1>Email Verification</h1>
            {hasRecoveryEmail ? (
              <p>
                Enter the 6 digit password reset code requested for <strong>{email}</strong>.
              </p>
            ) : (
              <p>Return to Forgot Password and request a new code to continue.</p>
            )}
          </header>

          <div className="verification-code" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(node) => {
                  inputRefs.current[index] = node;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={digit}
                onChange={(event) => updateDigit(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                aria-label={`Verification code digit ${index + 1}`}
                placeholder="–"
              />
            ))}
          </div>

          <button className="proceed-button verification-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Verifying…" : "Confirm"}
          </button>

          <p className="resend-code">
            Didn’t get the code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={!hasRecoveryEmail || isResending || resendRemainingSeconds > 0}
            >
              {isResending
                ? "Requesting…"
                : resendRemainingSeconds > 0
                  ? `Resend in ${resendRemainingSeconds}s`
                  : "Resend Code"}
            </button>
          </p>

          <p className="form-message" aria-live="polite">
            {message}
          </p>
        </form>
      </section>
    </main>
  );
}

function NewPasswordScreen({ onBack, onComplete }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "At least one number", met: /\d/.test(password) },
    {
      label: "Mix of uppercase and lowercase letters",
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    { label: "At least one symbol", met: /[^A-Za-z0-9]/.test(password) },
  ];

  async function handleSubmit(event) {
    event.preventDefault();

    if (requirements.some((requirement) => !requirement.met)) {
      setMessage("Your password does not meet all four requirements.");
      return;
    }

    if (password !== confirmation) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      await onComplete(password);
    } catch (error) {
      setMessage(error.message || "Unable to reset the password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function NewPasswordField({
    id,
    label,
    value,
    onChange,
    isVisible,
    onToggleVisibility,
  }) {
    return (
      <label className="field login-field" htmlFor={id}>
        <span className="field__label">{label}</span>
        <span className="field__control password-only-control">
          <input
            id={id}
            type={isVisible ? "text" : "password"}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Enter Password"
            autoComplete="new-password"
          />
          <button
            className="visibility-button"
            type="button"
            onClick={onToggleVisibility}
            aria-label={`${isVisible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            aria-pressed={isVisible}
          >
            <img src={visibilityIcon} alt="" />
          </button>
        </span>
      </label>
    );
  }

  return (
    <main className="sign-in-page new-password-page">
      <section
        className="illustration-panel recovery-illustration"
        aria-label="Create a secure password"
      >
        <img src={illustration} alt="Password security lock illustration" />
      </section>

      <section className="form-panel new-password-panel">
        <button className="back-button" type="button" onClick={onBack} aria-label="Back">
          ←
        </button>

        <form className="new-password-form" onSubmit={handleSubmit} noValidate>
          <header className="new-password-heading">
            <h1>Create New Password</h1>
            <p>Secure your facility account with a strong password</p>
          </header>

          <div className="login-fields">
            <NewPasswordField
              id="new-password"
              label="Password"
              value={password}
              onChange={setPassword}
              isVisible={showPassword}
              onToggleVisibility={() => setShowPassword((visible) => !visible)}
            />
            <NewPasswordField
              id="new-password-confirmation"
              label="Confirm Password"
              value={confirmation}
              onChange={setConfirmation}
              isVisible={showConfirmation}
              onToggleVisibility={() => setShowConfirmation((visible) => !visible)}
            />
          </div>

          <section className="password-requirements" aria-label="Password requirements">
            <h2>Create a Secure Password with These Requirements</h2>
            <div className="requirement-list">
              {requirements.map((requirement) => (
                <p
                  className={requirement.met ? "requirement requirement--met" : "requirement"}
                  key={requirement.label}
                >
                  <span aria-hidden="true">{requirement.met ? "✓" : "○"}</span>
                  {requirement.label}
                </p>
              ))}
            </div>
          </section>

          <button className="proceed-button new-password-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Resetting…" : "Confirm"}
          </button>

          <p className="form-message" aria-live="polite">
            {message}
          </p>
        </form>
      </section>
    </main>
  );
}

function PasswordResetCompleteScreen({ onBack, onLogin }) {
  return (
    <main className="sign-in-page reset-complete-page">
      <section
        className="illustration-panel recovery-illustration"
        aria-label="Password reset complete"
      >
        <img src={illustration} alt="Password security lock illustration" />
      </section>

      <section className="form-panel reset-complete-panel">
        <button className="back-button" type="button" onClick={onBack} aria-label="Back">
          ←
        </button>

        <div className="reset-complete">
          <span className="reset-complete__icon">
            <img src={checkCircleIcon} alt="" />
          </span>
          <div className="reset-complete__copy">
            <h1>Password Successfully Reset</h1>
            <p>
              You can now log in using your
              <br />
              new password
            </p>
          </div>
          <button className="proceed-button reset-complete__button" type="button" onClick={onLogin}>
            Proceed to Log In
          </button>
        </div>
      </section>
    </main>
  );
}

function AuthenticationApp({ onAuthenticated }) {
  const [invitation] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      email: params.get("email") || "",
      inviteToken: params.get("inviteToken") || "",
      firstName: params.get("firstName") || "",
      lastName: params.get("lastName") || "",
    };
  });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState(() => readRecoveryValue(RECOVERY_EMAIL_STORAGE_KEY));
  const [resetToken, setResetToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAdmin, setCreatedAdmin] = useState(null);
  const [screen, setScreen] = useState(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("status") === "failed") return "failed";
    if (params.get("status") === "complete") return "complete";
    if (params.get("screen") === "setup") return "setup";
    if (params.get("screen") === "forgot") return "forgot";
    if (params.get("screen") === "verification") return "verification";
    if (params.get("screen") === "new-password") return "new-password";
    if (params.get("screen") === "reset-complete") return "reset-complete";
    return "login";
  });

  async function handleSubmit(event) {
    event.preventDefault();

    if (password.length < 8) {
      setMessage("Password should be at least 8 characters.");
      return;
    }

    if (password !== confirmation) {
      setMessage("Passwords do not match.");
      return;
    }

    if (!invitation.email || !invitation.inviteToken || !invitation.firstName || !invitation.lastName) {
      setMessage("This administrator invitation link is incomplete.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      const result = await signupAdmin({ ...invitation, password });
      setCreatedAdmin(result.admin);
      setScreen("complete");
    } catch (error) {
      setMessage(error.message || "Account setup failed.");
      setScreen("failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (screen === "login") {
    return (
      <LoginScreen
        onLogin={async (email, loginPassword) => {
          const result = await loginAdmin(email, loginPassword);
          onAuthenticated(result.admin);
        }}
        onForgotPassword={() => {
          clearRecoverySession();
          setRecoveryEmail("");
          setResetToken("");
          window.history.replaceState({}, "", "?screen=forgot");
          setScreen("forgot");
        }}
      />
    );
  }

  if (screen === "forgot") {
    return (
      <ForgotPasswordScreen
        onBack={() => {
          clearRecoverySession();
          setRecoveryEmail("");
          setResetToken("");
          window.history.replaceState({}, "", window.location.pathname);
          setScreen("login");
        }}
        onContinue={async (email) => {
          await requestPasswordReset(email);
          setRecoveryEmail(email);
          writeRecoveryValue(RECOVERY_EMAIL_STORAGE_KEY, email);
          beginResendCooldown();
          window.history.replaceState({}, "", "?screen=verification");
          setScreen("verification");
        }}
      />
    );
  }

  if (screen === "verification") {
    return (
      <VerificationScreen
        email={recoveryEmail}
        onBack={() => {
          window.history.replaceState({}, "", "?screen=forgot");
          setScreen("forgot");
        }}
        onVerified={async (code) => {
          if (!isValidRecoveryEmail(recoveryEmail)) {
            throw new Error("Your password reset session has expired. Request a new code.");
          }
          const result = await verifyPasswordResetCode(recoveryEmail, code);
          setResetToken(result.resetToken);
          window.history.replaceState({}, "", "?screen=new-password");
          setScreen("new-password");
        }}
        onResend={async () => {
          if (!isValidRecoveryEmail(recoveryEmail)) {
            throw new Error("Your password reset session has expired. Request a new code.");
          }
          const result = await requestPasswordReset(recoveryEmail);
          beginResendCooldown();
          return result;
        }}
      />
    );
  }

  if (screen === "new-password") {
    return (
      <NewPasswordScreen
        onBack={() => {
          window.history.replaceState({}, "", "?screen=verification");
          setScreen("verification");
        }}
        onComplete={async (newPassword) => {
          if (!resetToken) throw new Error("Your reset session has expired. Request a new code.");
          await resetAdminPassword(resetToken, newPassword);
          window.history.replaceState({}, "", "?screen=reset-complete");
          setScreen("reset-complete");
        }}
      />
    );
  }

  if (screen === "reset-complete") {
    return (
      <PasswordResetCompleteScreen
        onBack={() => {
          window.history.replaceState({}, "", "?screen=new-password");
          setScreen("new-password");
        }}
        onLogin={() => {
          clearRecoverySession();
          setRecoveryEmail("");
          setResetToken("");
          window.history.replaceState({}, "", window.location.pathname);
          setScreen("login");
        }}
      />
    );
  }

  if (screen === "complete") {
    return (
      <main className="sign-in-page">
        <section className="illustration-panel" aria-label="Axonlink account security">
          <img
            src={setupCompleteIllustration}
            alt="An account profile and password displayed on a laptop"
          />
        </section>

        <section className="form-panel completion-panel">
          <div className="completion">
            <div className="completion__content">
              <span className="completion__icon">
                <img src={checkCircleIcon} alt="" />
              </span>
              <div className="completion__copy">
                <h1>Setup Complete</h1>
                <p>
                  Your account setup is complete and your admin workspace is ready to
                  use.
                </p>
              </div>
            </div>
            <button className="completion__button" type="button" onClick={() => onAuthenticated(createdAdmin)}>
              Proceed
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (screen === "failed") {
    return (
      <main className="sign-in-page">
        <section className="illustration-panel" aria-label="Axonlink account security">
          <img
            src={setupCompleteIllustration}
            alt="An account profile and password displayed on a laptop"
          />
        </section>

        <section className="form-panel completion-panel">
          <div className="completion">
            <div className="completion__content">
              <span className="completion__icon completion__icon--failed">
                <img src={setupFailedIcon} alt="" />
              </span>
              <div className="completion__copy">
                <h1>Account Setup Failed</h1>
                <p>{message || "We couldn’t complete your account setup at the moment. Please try again."}</p>
              </div>
            </div>
            <button
              className="completion__button"
              type="button"
              onClick={() => {
                setMessage("");
                setScreen("setup");
              }}
            >
              Try Again
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="sign-in-page">
      <section className="illustration-panel" aria-label="Axonlink account security">
        <img src={illustration} alt="An account profile and password displayed on a laptop" />
      </section>

      <section className="form-panel">
        <form className="sign-in-form" onSubmit={handleSubmit} noValidate>
          <header className="welcome-card">
            <span className="welcome-card__mark">
              <img src={axonlinkMark} alt="" />
            </span>
            <span className="welcome-card__copy">
              <h1>Welcome to Axonlink Admin</h1>
              <p>
                You’ve been invited to join the Axonlink admin workspace. Set up your
                account password to get started.
              </p>
            </span>
          </header>

          <div className="form-fields">
            <label className="field" htmlFor="registered-email">
              <span className="field__label">Registered Mail</span>
              <input
                id="registered-email"
                className="registered-email"
                value={invitation.email}
                readOnly
                aria-readonly="true"
              />
            </label>

            <PasswordField
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
            />
            <PasswordField
              id="confirm-password"
              label="Confirm Password"
              value={confirmation}
              onChange={setConfirmation}
            />

            <p className="password-hint">
              <img src={infoIcon} alt="" />
              Password should be at least 8 characters
            </p>
          </div>

          <button className="proceed-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating Account…" : "Proceed"}
          </button>

          <p className="form-message" aria-live="polite">
            {message}
          </p>
        </form>
      </section>
    </main>
  );
}

export default AuthenticationApp;

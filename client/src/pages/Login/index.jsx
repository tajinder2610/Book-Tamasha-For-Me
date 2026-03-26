import React, { useEffect, useState } from "react";
import { Button, Form, Input, Typography, message } from "antd";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LoginUser } from "../../api/users";
import { handleAuthSuccess } from "../../utils/authRedirect";
import AuthPosterBackground from "../../Components/AuthPosterBackground";

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleLoginUrl = `${import.meta.env.VITE_API_BASE_URL || ""}/api/users/google/login`;

  useEffect(() => {
    const oauthError = searchParams.get("oauthError");
    if (oauthError) {
      message.error(oauthError);
      navigate("/login", { replace: true });
    }
  }, [navigate, searchParams]);

  const onFinish = async (value) => {
  setIsSubmitting(true);
  try {
    const response = await LoginUser(value);

    if (response.success) {
      message.success(response.message);
      handleAuthSuccess(response.data, navigate);
    } else {
      if (response.data?.isBlocked) {
        navigate("/blocked-user-access-denied");
      } else {
        message.error(response.message);
      }
    }
  } catch (err) {
    message.error(err?.response?.data?.message || err.message || "Login failed");
  } finally {
    setIsSubmitting(false);
  }
};
  return (
    <main className="auth-shell">
      <AuthPosterBackground />
      <section className="auth-card auth-card-login">
        <div className="auth-head">
          <Typography.Title level={2} className="m-0">
            Welcome Back
          </Typography.Title>
          <Typography.Paragraph className="m-0">
            Login to continue your movie booking journey.
          </Typography.Paragraph>
        </div>

        <Form
          layout="vertical"
          onFinish={onFinish}
          className="auth-form auth-login-form"
          validateTrigger="onBlur"
          requiredMark={false}
        >
          <Form.Item
            label="Email"
            name="email"
            className="d-block"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Please enter a valid email" }
            ]}
          >
            <Input
              type="email"
              size="large"
              autoComplete="email"
              placeholder="Enter your Email"
            />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            className="d-block"
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input.Password
              size="large"
              autoComplete="current-password"
              placeholder="Enter your Password"
            />
          </Form.Item>

          <Form.Item className="d-block">
            <Button
              type="primary"
              size="large"
              block
              htmlType="submit"
              loading={isSubmitting}
            >
              Login
            </Button>
          </Form.Item>
        </Form>

        <div className="oauth-divider">
          <span>or</span>
        </div>

        <Button
          size="large"
          block
          className="google-login-button"
          onClick={() => {
            window.location.assign(googleLoginUrl);
          }}
        >
          <span className="google-login-content">
            <svg
              className="google-login-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.31h6.47a5.53 5.53 0 0 1-2.4 3.63v3.01h3.89c2.28-2.1 3.53-5.18 3.53-8.68z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.89-3.01c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.96H1.27v3.11A12 12 0 0 0 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.29 14.27A7.19 7.19 0 0 1 4.91 12c0-.79.14-1.56.38-2.27V6.62H1.27A12 12 0 0 0 0 12c0 1.93.46 3.76 1.27 5.38l4.02-3.11z"
              />
              <path
                fill="#EA4335"
                d="M12 4.77c1.76 0 3.35.61 4.6 1.81l3.45-3.45C17.95 1.16 15.23 0 12 0A12 12 0 0 0 1.27 6.62l4.02 3.11c.94-2.85 3.59-4.96 6.71-4.96z"
              />
            </svg>
            <span>Continue with Google</span>
          </span>
        </Button>

        <div className="auth-links">
          <Typography.Paragraph className="auth-links-label m-0">
            Need help?
          </Typography.Paragraph>
          <div className="auth-link-actions">
            <Link to="/register" className="auth-link-chip">
              Register here
            </Link>
            <Link to="/forget" className="auth-link-chip">
              Reset password
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Login;

import React, { useEffect, useState } from "react";
import { Button, Form, Input, Typography, message } from "antd";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LoginUser } from "../../api/users";
import { handleAuthSuccess } from "../../utils/authRedirect";

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
          Continue with Google
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

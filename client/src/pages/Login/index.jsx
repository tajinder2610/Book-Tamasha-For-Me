import React, { useState } from "react";
import { Button, Form, Input, Typography, message } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { LoginUser } from "../../api/users";
function Login() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onFinish = async (value) => {
  setIsSubmitting(true);
  try {
    const response = await LoginUser(value);

    if (response.success) {
      message.success(response.message);

      // store token
      localStorage.setItem("token", response.data.token);

      const role = response.data.role;
      const partnerRequestStatus = response.data.partnerRequestStatus;

      if (
        role === "user" &&
        ["pending", "rejected", "blocked"].includes(partnerRequestStatus)
      ) {
        localStorage.removeItem("token");
        navigate("/partner-approval-pending");
        return;
      }

      if (role === "admin") {
        navigate("/admin");
      } else if (role === "partner") {
        navigate("/partner");
      } else {
        navigate("/");
      }

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

import React from "react";
import { Button, Form, Input, Typography, message } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { LoginUser } from "../../api/users";
function Login() {
  const navigate = useNavigate();
  const onFinish = async (value) => {
  try {
    const response = await LoginUser(value);

    if (response.success) {
      message.success(response.message);

      // store token
      localStorage.setItem("token", response.data.token);

      const role = response.data.role;

      if (role === "admin") {
        navigate("/admin");
      } else if (role === "partner") {
        navigate("/partner");
      } else {
        navigate("/");
      }

    } else {
      message.error(response.message);
    }
  } catch (err) {
    message.error(err.message);
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

        <Form layout="vertical" onFinish={onFinish} className="auth-form">
          <Form.Item
            label="Email"
            name="email"
            className="d-block"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Please enter a valid email" }
            ]}
          >
            <Input type="email" placeholder="Enter your Email" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            className="d-block"
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input type="password" placeholder="Enter your Password" />
          </Form.Item>

          <Form.Item className="d-block">
            <Button
              type="primary"
              block
              htmlType="submit"
              style={{ fontSize: "1rem", fontWeight: "600" }}
            >
              Login
            </Button>
          </Form.Item>
        </Form>

        <div className="auth-links">
          <p>
            New user?{" "}
            <Link to="/register" className="auth-link-no-underline">
              Register here
            </Link>
          </p>
          <p>
            Forgot password?{" "}
            <Link to="/forget" className="auth-link-no-underline">
              Reset here
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;

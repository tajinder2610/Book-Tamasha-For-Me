import React from 'react';
import { Button, Form, Input, Typography, message, Radio } from 'antd';
import { Link } from "react-router-dom";
import { RegisterUser } from '../../api/users';
import { useNavigate } from "react-router-dom";
import AuthPosterBackground from "../../Components/AuthPosterBackground";
const Register = () => {
  const navigate = useNavigate();
  const onFinish = async(value) => {
    try{
      const response = await RegisterUser(value);
      if(response.success){
        message.success(response.message);
        if (response.data?.partnerRequestStatus === "pending") {
          navigate("/partner-request-sent");
        } else {
          navigate("/login");
        }
      }else{
        message.error(response.message);
      }
    }catch(err){
      message.error(err.message);
    }
  }
  return (
    <main className="auth-shell">
          <AuthPosterBackground />
          <section className="auth-card auth-card-wide">
            <div className="auth-head">
              <Typography.Title level={2} className="m-0">
                Create Account
              </Typography.Title>
              <Typography.Paragraph className="m-0">
                Join now to book tickets and manage shows.
              </Typography.Paragraph>
            </div>

            <Form
              layout="vertical"
              onFinish={onFinish}
              className="auth-form"
              validateTrigger="onBlur"
              requiredMark={false}
            >
              <Form.Item
                label="Name"
                name="name"
                className="d-block"
                rules={[
                  { required: true, message: "Name is required" }
                ]}
              >
                <Input size="large" type="text" autoComplete="name" placeholder="Enter your Name" />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                className="d-block"
                rules={[
                  { required: true, message: "Email is required" },
                  { type: "email", message: "Please enter a valid email" }
                ]}
              >
                <Input size="large" type="email" autoComplete="email" placeholder="Enter your Email" />
              </Form.Item>
    
              <Form.Item
                label="Password"
                name="password"
                className="d-block"
                rules={[{ required: true, message: "Password is required" }]}
              >
                <Input.Password
                  size="large"
                  autoComplete="new-password"
                  placeholder="Enter your Password"
                />
              </Form.Item>

              <Form.Item
                label="Confirm Password"
                name="confirmPassword"
                className="d-block"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "Confirm Password is required" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("Passwords do not match"));
                    },
                  }),
                ]}
              >
                <Input.Password
                  size="large"
                  autoComplete="new-password"
                  placeholder="Re-enter your Password"
                />
              </Form.Item>

              <Form.Item
                label="Register as a Partner"
                htmlFor="role"
                name="role"
                className="d-block"
                initialValue={"user"}
                rules={[{ required: true, message: "Please select an option!" }]}
              >
                <Radio.Group name="radiogroup" className="register-role-group">
                  <Radio value={"partner"}>Yes</Radio>
                  <Radio value={"user"}>No</Radio>
                </Radio.Group>
              </Form.Item>


              <Form.Item className="d-block">
                <Button
                  type="primary"
                  size="large"
                  block
                  htmlType="submit"
                >
                  Register
                </Button>
              </Form.Item>
            </Form>

            <div className="auth-links">
              <Typography.Paragraph className="auth-links-label m-0">
                Already have an account?
              </Typography.Paragraph>
              <div className="auth-link-actions">
                <Link to="/login" className="auth-link-chip">Login here</Link>
              </div>
            </div>
          </section>
        </main>
  )
}
export default Register;

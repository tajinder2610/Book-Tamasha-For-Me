import React from "react";
import { Button, Form, Input, Typography } from "antd";
import { ResetPassword } from "../api/users";
import { message } from "antd";
import { useParams, useNavigate, Link } from "react-router-dom";


function Reset() {
 const { email } = useParams(); // Extract email from URL parameters
 const navigate = useNavigate();
 const onFinish = async (values) => {
   if (!email) {
     message.error("Invalid reset link. Please start from Forgot Password.");
     return;
   }
   try {
     const response = await ResetPassword(email, values);
     if (response.success) {
       message.success(response.message);
       // window.location.href = "/login";
       navigate("/login");
     } else {
       message.error(response.message);
     }
   } catch (error) {
     message.error(error.message);
   }
 };
 return (
     <main className="auth-shell">
       <section className="auth-card">
         <div className="auth-head">
           <Typography.Title level={2} className="m-0">
             Reset Password
           </Typography.Title>
           <Typography.Paragraph className="m-0">
             Enter OTP and your new password.
           </Typography.Paragraph>
           {!email && (
             <Typography.Paragraph className="m-0">
               Missing email in reset link. Go to <Link to="/forget">Forgot Password</Link> to generate a valid link.
             </Typography.Paragraph>
           )}
         </div>

           <Form layout="vertical" onFinish={onFinish} className="auth-form">
             <Form.Item
               label="OTP"
               htmlFor="otp"
               name="otp"
               className="d-block"
               rules={[{ required: true, message: "OTP is required" }]}
             >
               <Input
                 id="otp"
                 type="number"
                 placeholder="Enter your otp"
               ></Input>
             </Form.Item>


             <Form.Item
               label="Password"
               htmlFor="password"
               name="password"
               className="d-block"
               rules={[{ required: true, message: "Password is required" }]}
             >
               <Input
                 id="password"
                 type="password"
                 placeholder="Enter your Password"
               ></Input>
             </Form.Item>
             <Form.Item className="d-block">
               <Button
                 type="primary"
                 block
                 htmlType="submit"
                >
                 RESET PASSWORD
               </Button>
             </Form.Item>
           </Form>
       </section>
     </main>
 );
}

export default Reset;

import React, { useEffect } from "react";
import { Button, Form, Input, Typography } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { ForgetPassword } from "../api/users";
import { message } from "antd";


function Forget() {
 const navigate = useNavigate();
 const onFinish = async (values) => {
   try {
     const response = await ForgetPassword(values);
     
     if (response.success) {
       message.success(response.message);
       if (response?.data?.emailSent) {
         message.info("OTP sent to your email");
       } else {
         message.warning("OTP created, but mail delivery failed. Contact admin or check backend logs.");
       }
       navigate(`/reset/${encodeURIComponent(values.email)}`);
     } else {
       message.error(response.message);
     }
   } catch (error) {
     message.error(error.message);
   }
 };
 useEffect(() => {
   if (localStorage.getItem("token")) {
     navigate("/");
   }
 }, []);
 return (
     <main className="auth-shell">
       <section className="auth-card">
         <div className="auth-head">
           <Typography.Title level={2} className="m-0">
             Forgot Password
           </Typography.Title>
           <Typography.Paragraph className="m-0">
             Enter your email to receive a one-time password.
           </Typography.Paragraph>
         </div>

           <Form layout="vertical" onFinish={onFinish} className="auth-form">
             <Form.Item
               label="Email"
               htmlFor="email"
               name="email"
               className="d-block"
               rules={[{ required: true, message: "Email is required" }]}
             >
               <Input
                 id="email"
                 type="text"
                 placeholder="Enter your Email"
               ></Input>
             </Form.Item>


             <Form.Item className="d-block">
               <Button
                 type="primary"
                 block
                 htmlType="submit"
                 style={{ fontSize: "1rem", fontWeight: "600" }}
               >
                 SEND OTP
               </Button>
             </Form.Item>
           </Form>
           <div className="auth-links">
             <p>
               Existing user? <Link to="/login" className="auth-link-no-underline">Login here</Link>
             </p>
           </div>
       </section>
     </main>
 );
}

export default Forget;

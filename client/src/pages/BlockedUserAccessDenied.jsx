import React from "react";
import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";

function BlockedUserAccessDenied() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        height: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Result
        status="403"
        title="Access Denied"
        subTitle="Your account has been blocked due to security reasons."
        extra={
          <Button type="primary" onClick={() => navigate("/login")}>
            Go to Login
          </Button>
        }
      />
    </div>
  );
}

export default BlockedUserAccessDenied;

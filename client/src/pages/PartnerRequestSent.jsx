import React from "react";
import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";

function PartnerRequestSent() {
  const navigate = useNavigate();

  return (
    <div className="status-page-shell">
      <Result
        status="info"
        title="Partner Request Submitted"
        subTitle="Your Partner request is sent to Admin for approval."
        extra={
          <Button type="primary" onClick={() => navigate("/login")}>
            Go to Login
          </Button>
        }
      />
    </div>
  );
}

export default PartnerRequestSent;

import React from "react";
import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";

function PartnerApprovalPending() {
  const navigate = useNavigate();

  return (
    <div className="status-page-shell">
      <Result
        status="warning"
        title="Partner Approval Pending"
        subTitle={
          <>
            <div>Your Partner request is pending with Admin.</div>
            <div style={{ marginTop: 8 }}>
              Admin Contacts-
              <br />
              Email: tajinderpalsingh26@gmail.com
              <br />
              Phone: +91-9682662847
            </div>
          </>
        }
        extra={
          <Button type="primary" onClick={() => navigate("/login")}>
            Go to Login
          </Button>
        }
      />
    </div>
  );
}

export default PartnerApprovalPending;

import React, { useMemo, useState } from "react";
import { Button, Card, Space, Typography, message } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CompleteGoogleSignup } from "../api/users";
import { handleAuthSuccess } from "../utils/authRedirect";

function OAuthRoleSelection() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signupToken = searchParams.get("signupToken");

  const options = useMemo(
    () => [
      {
        key: "user",
        title: "Continue as User",
        description: "Book movies, manage your profile, and explore shows right away.",
      },
      {
        key: "partner",
        title: "Continue as Partner",
        description: "Send a partner request for admin approval before accessing theatre tools.",
      },
    ],
    []
  );

  const handleSelectRole = async (role) => {
    if (!signupToken) {
      message.error("Google signup session expired. Please try again.");
      navigate("/login");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await CompleteGoogleSignup({ signupToken, role });
      if (!response.success) {
        message.error(response.message);
        return;
      }

      message.success(response.message);
      handleAuthSuccess(response.data, navigate);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card-wide oauth-selection-card">
        <div className="auth-head">
          <Typography.Title level={2} className="m-0">
            One Last Step
          </Typography.Title>
          <Typography.Paragraph className="m-0">
            Choose how you want to use Book Tamasha For Me.
          </Typography.Paragraph>
        </div>

        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {options.map((option) => (
            <Card key={option.key} className="oauth-role-card">
              <Typography.Title level={4}>{option.title}</Typography.Title>
              <Typography.Paragraph>{option.description}</Typography.Paragraph>
              <Button
                type="primary"
                size="large"
                loading={isSubmitting}
                onClick={() => handleSelectRole(option.key)}
              >
                Select {option.key === "partner" ? "Partner" : "User"}
              </Button>
            </Card>
          ))}
        </Space>
      </section>
    </main>
  );
}

export default OAuthRoleSelection;

import React, { useEffect } from "react";
import { Result, Spin, message } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import { handleAuthSuccess } from "../utils/authRedirect";

function OAuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const oauthError = searchParams.get("oauthError");

    if (oauthError) {
      message.error(oauthError);
      navigate("/login", { replace: true });
      return;
    }

    handleAuthSuccess(
      {
        token: searchParams.get("token"),
        role: searchParams.get("role"),
        partnerRequestStatus: searchParams.get("partnerRequestStatus"),
        next: searchParams.get("next"),
      },
      navigate
    );
  }, [navigate, searchParams]);

  return (
    <Result
      icon={<Spin size="large" />}
      title="Completing Google sign-in"
      subTitle="Please wait while we finish your login."
    />
  );
}

export default OAuthSuccess;

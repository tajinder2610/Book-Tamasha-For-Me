import { useEffect, useRef, useState } from "react";
import { Button, Result, Spin, message } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { hideLoading, showLoading } from "../../redux/loaderSlice";
import { ConfirmCheckoutSession } from "../api/bookings";

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const hasConfirmed = useRef(false);

  useEffect(() => {
    const confirm = async () => {
      const sessionId = searchParams.get("session_id");
      if (!sessionId) {
        setStatus("error");
        setErrorMessage("Missing Stripe session id");
        return;
      }

      try {
        dispatch(showLoading());
        const response = await ConfirmCheckoutSession({ sessionId });
        if (response.success) {
          setStatus("success");
          message.success("Payment verified and booking confirmed");
          setTimeout(() => navigate("/profile"), 1200);
        } else {
          setStatus("error");
          setErrorMessage(response.message || "Unable to confirm booking");
        }
      } catch (err) {
        setStatus("error");
        setErrorMessage(err.message || "Unable to confirm booking");
      } finally {
        dispatch(hideLoading());
      }
    };

    if (!hasConfirmed.current) {
      hasConfirmed.current = true;
      confirm();
    }
  }, [dispatch, navigate, searchParams]);

  if (status === "loading") {
    return (
      <div className="text-center pt-3">
        <Spin size="large" />
        <h3 className="mt-3">Verifying payment and creating booking...</h3>
      </div>
    );
  }

  if (status === "error") {
    return (
      <Result
        status="error"
        title="Payment Completed But Booking Failed"
        subTitle={errorMessage}
        extra={
          <Button type="primary" onClick={() => navigate("/profile")}>
            Go To Profile
          </Button>
        }
      />
    );
  }

  return (
    <Result
      status="success"
      title="Payment Successful"
      subTitle="Your booking is confirmed. Redirecting to profile..."
      extra={
        <Button type="primary" onClick={() => navigate("/profile")}>
          Go To Profile
        </Button>
      }
    />
  );
}

export default PaymentSuccess;

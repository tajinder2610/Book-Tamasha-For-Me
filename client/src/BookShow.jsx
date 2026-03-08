import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { hideLoading, showLoading } from "../redux/loaderSlice";
import { ShowById } from "./api/shows";
import { useParams } from "react-router-dom";
import { Card, Col, message, Row, Button, Divider, Tag } from "antd";
import moment from "moment";
import { loadStripe } from "@stripe/stripe-js";
import { CreateCheckoutSession } from "./api/bookings";

function BookShow() {
  const params = useParams();
  const dispatch = useDispatch();

  const [show, setShow] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [isCheckoutProcessing, setIsCheckoutProcessing] = useState(false);

  const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  const getData = async () => {
    try {
      dispatch(showLoading());
      const response = await ShowById(params.id);

      if (response.success) {
        setShow(response.data);
      } else {
        message.error(response.message);
      }

      dispatch(hideLoading());
    } catch (err) {
      message.error(err.message);
      dispatch(hideLoading());
    }
  };

  useEffect(() => {
    getData();
  }, [params.id]);

  const selectedSeatsSorted = [...selectedSeats].sort((a, b) => a - b);
  const availableSeats = show ? show.totalSeats - show.bookedSeats.length : 0;
  const totalPrice = show ? selectedSeats.length * show.ticketPrice : 0;

  const startCheckout = async () => {
    if (isCheckoutProcessing) return;
    if (!selectedSeats.length) {
      message.warning("Please select at least one seat");
      return;
    }

    try {
      setIsCheckoutProcessing(true);
      dispatch(showLoading());

      const response = await CreateCheckoutSession({
        showId: params.id,
        seats: selectedSeats,
      });

      if (response.success) {
        const sessionId = response?.data?.sessionId;
        const sessionUrl = response?.data?.url;
        if (sessionUrl) {
          window.location.assign(sessionUrl);
          return;
        }

        if (!sessionId) {
          message.error("Unable to create checkout session");
          return;
        }

        if (!STRIPE_KEY) {
          message.error("Missing Stripe publishable key");
          return;
        }

        const stripe = await loadStripe(STRIPE_KEY);
        if (!stripe) {
          message.error("Unable to initialize Stripe");
          return;
        }

        const result = await stripe.redirectToCheckout({ sessionId });
        if (result.error?.message) {
          message.error(result.error.message);
        }
      } else {
        message.error(response.message);
      }
    } catch (err) {
      message.error(err.message);
    } finally {
      setIsCheckoutProcessing(false);
      dispatch(hideLoading());
    }
  };

  const getSeats = () => {
    const columns = 12;
    const totalSeats = show.totalSeats;
    const rows = Math.ceil(totalSeats / columns);

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        <div className="max-width-600 w-100 mx-auto mb-10px text-center">
          <p className="book-show-mobile-theatre-name">
            Theatre: {show?.theatre?.name || "N/A"}
          </p>
        </div>

        <div className="w-100 max-width-600 mx-auto mb-25px">
          <p className="text-center mb-10px" style={{ color: "#666", fontWeight: 500 }}>
            Screen this side, you will be watching in this direction
          </p>
          <div className="screen-div"></div>
        </div>

        <div className="max-width-600 w-100 mx-auto">
          {Array.from(Array(rows).keys()).map((row) => (
            <ul
              key={row}
              className="seat-ul"
              style={{
                justifyContent: "center",
                marginInline: "auto",
                marginBottom: row === rows - 1 ? 0 : "0.25rem",
              }}
            >
              {Array.from(Array(columns).keys()).map((column) => {
                const seatNumber = row * columns + column + 1;

                if (seatNumber > totalSeats) return null;

                let seatClass = "seat-btn";

                if (selectedSeats.includes(seatNumber)) {
                  seatClass += " selected";
                }

                if (show?.bookedSeats?.includes(seatNumber)) {
                  seatClass += " booked";
                }

                return (
                  <li key={seatNumber}>
                    <button
                      className={seatClass}
                      disabled={show.bookedSeats.includes(seatNumber)}
                      onClick={() => {
                        if (show.bookedSeats.includes(seatNumber)) return;

                        if (selectedSeats.includes(seatNumber)) {
                          setSelectedSeats(
                            selectedSeats.filter(
                              (seat) => seat !== seatNumber
                            )
                          );
                        } else {
                          setSelectedSeats([...selectedSeats, seatNumber]);
                        }
                      }}
                    >
                      {seatNumber}
                    </button>
                  </li>
                );
              })}
            </ul>
          ))}
        </div>

        <div
          className="bottom-card w-100 max-width-600 mx-auto mb-25px mt-3"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div className="flex-1">
            Selected Seats:{" "}
            <span>{selectedSeatsSorted.length ? selectedSeatsSorted.join(", ") : "None"}</span>
          </div>

          <div className="flex-shrink-0 ms-3">
            Total Price: <span>Rs. {totalPrice}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {show && (
        <Row gutter={24}>
          <Col span={24}>
            <div className="max-width-600 mx-auto mb-10px text-center book-show-badge">
              
            </div>
            <Card
              className="book-show-card"
              title={
                <div className="movie-title-details book-show-title">
                  <h1>{show.movie.name}</h1>
                  <p className="book-show-theatre-name">
                    Theatre: {show?.theatre?.name || "N/A"}
                  </p>
                  <p className="book-show-theatre-address">
                    Address: {show?.theatre?.address || "N/A"}
                  </p>
                </div>
              }
              extra={
                <div className="show-name py-3 book-show-extra">
                  <h3>
                    <span>Show Name:</span> {show.name}
                  </h3>

                  <h3>
                    <span>Date & Time: </span>
                    {moment(show.date).format("MMM Do YYYY")} at{" "}
                    {moment(show.time, "HH:mm").format("hh:mm A")}
                  </h3>

                  <h3>
                    <span>Ticket Price:</span> Rs. {show.ticketPrice}/-
                  </h3>

                  <h3>
                    <span>Total Seats:</span> {show.totalSeats} 
                    <span> &nbsp;|&nbsp; Available Seats:</span>{" "}
                    {availableSeats}
                  </h3>
                </div>
              }
              style={{ width: "100%" }}
              styles={{
                body: { paddingTop: 12 },
              }}
            >
              <Divider className="book-show-divider" style={{ marginTop: 0, marginBottom: 8 }} />
              {getSeats()}

              <div className="max-width-600 mx-auto">
                <Button
                  type="primary"
                  shape="round"
                  size="large"
                  block
                  loading={isCheckoutProcessing}
                  onClick={startCheckout}
                >
                  Confirm Seats & Pay
                </Button>
              </div>
            </Card>
          </Col>
        </Row>
      )}
    </>
  );
}

export default BookShow;


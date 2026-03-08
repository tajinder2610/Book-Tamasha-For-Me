import { Button, Card, Col, Row, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { hideLoading, showLoading } from "../../../redux/loaderSlice";
import { GetAllBookings } from "../../api/bookings";
import { useDispatch } from "react-redux";
import moment from "moment";
import QRCode from "qrcode";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

const buildQrPayload = (booking) => {
  const movieTitle = booking?.show?.movie?.title || booking?.show?.movie?.name || "Movie";
  const theatreName = booking?.show?.theatre?.name || "N/A";
  const seats = (booking?.seats || []).slice().sort((a, b) => a - b).join(", ");
  const bookingDate = moment(booking?.show?.date).format("MMM Do YYYY");
  const bookingTime = moment(booking?.show?.time, "HH:mm").format("hh:mm A");
  const bookingId = booking?.transactionId || booking?._id;
  return `Booking:${bookingId}|Movie:${movieTitle}|Theatre:${theatreName}|Seats:${seats}|Date:${bookingDate}|Time:${bookingTime}`;
};

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [qrFallbackMap, setQrFallbackMap] = useState({});
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.users);

  const getData = async () => {
    if (!user?._id) return;
    try {
      dispatch(showLoading());
      const response = await GetAllBookings({ userId: user._id });
      if (response.success) {
        const sortedBookings = [...(response.data || [])].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setBookings(sortedBookings);
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
  }, [user?._id]);

  const handleQrError = async (booking) => {
    if (qrFallbackMap[booking._id]) return;
    try {
      const dataUrl = await QRCode.toDataURL(buildQrPayload(booking), {
        width: 110,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      setQrFallbackMap((prev) => ({ ...prev, [booking._id]: dataUrl }));
    } catch {
      setQrFallbackMap((prev) => ({
        ...prev,
        [booking._id]:
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
      }));
    }
  };

  return (
    <div className="bookings-page">
      {bookings.length > 0 ? (
        <>
          <div className="bookings-page-head mb-3">
            <Typography.Title level={3} className="m-0">
              My Bookings
            </Typography.Title>
            <Tag color="blue">{bookings.length} total</Tag>
          </div>

          <Row gutter={[16, 16]}>
            {bookings.map((booking) => {
              const movieTitle = booking?.show?.movie?.title || booking?.show?.movie?.name || "Movie";
              const theatreName = booking?.show?.theatre?.name || "N/A";
              const seats = (booking?.seats || []).slice().sort((a, b) => a - b).join(", ");
              const amount = (booking?.seats?.length || 0) * (booking?.show?.ticketPrice || 0);
              const bookingDate = moment(booking?.show?.date).format("MMM Do YYYY");
              const bookingTime = moment(booking?.show?.time, "HH:mm").format("hh:mm A");
              const bookingId = booking?.transactionId || booking?._id;
              const bookedOn = moment(booking?.createdAt).format("DD MMM YYYY");
              const onlineQrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(
                buildQrPayload(booking)
              )}&size=110`;
              const qrUrl = qrFallbackMap[booking._id] || onlineQrUrl;

              return (
                <Col key={booking._id} xs={{ span: 24 }} lg={{ span: 12 }}>
                  <Card className="booking-card">
                    <div className="booking-card-layout">
                      <div className="booking-poster-wrap">
                        <img
                          src={booking?.show?.movie?.poster}
                          alt={movieTitle}
                          className="booking-poster"
                        />
                      </div>

                      <div className="booking-content booking-content-row">
                        <div className="booking-details">
                          <div className="booking-title-row">
                            <h3 className="booking-title">{movieTitle}</h3>
                          </div>

                          <p className="booking-line">
                            <span className="booking-key">Theatre</span>
                            <b>{theatreName}</b>
                          </p>
                          <p className="booking-line">
                            <span className="booking-key">Seats</span>
                            <b>{seats || "N/A"}</b>
                          </p>
                          <p className="booking-line">
                            <span className="booking-key">Date & Time</span>
                            <b>
                              {bookingDate} | {bookingTime}
                            </b>
                          </p>
                          <p className="booking-line">
                            <span className="booking-key">Amount</span>
                            <b>Rs. {amount}</b>
                          </p>
                          <p className="booking-line booking-id-line">
                            <span className="booking-key">Booking ID</span>
                            <b>{bookingId}</b>
                          </p>
                          <p className="booking-meta-note">Booked on {bookedOn}</p>
                        </div>

                        <div className="booking-qr-wrap">
                          <Tag color="green" className="m-0">
                            Confirmed
                          </Tag>
                          <img
                            src={qrUrl}
                            alt="Booking QR"
                            className="booking-qr"
                            onError={() => handleQrError(booking)}
                          />
                          <span className="booking-qr-label">Scan Ticket</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </>
      ) : (
        <div className="text-center pt-3 booking-empty">
          <Typography.Title level={3}>No Bookings Yet</Typography.Title>
          <Typography.Paragraph type="secondary">
            You have not booked any show yet.
          </Typography.Paragraph>
          <Link to="/">
            <Button type="primary" shape="round">
              Start Booking
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};
export default Bookings;

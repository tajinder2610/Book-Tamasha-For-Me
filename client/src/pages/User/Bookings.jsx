import { Button, Card, Col, Row, Tag, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { hideLoading, showLoading } from "../../../redux/loaderSlice";
import { GetAllBookings } from "../../api/bookings";
import { useDispatch } from "react-redux";
import moment from "moment";
import QRCode from "qrcode";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

const buildPosterFallback = (title = "Movie") => {
  const safeTitle = String(title).trim().slice(0, 28) || "Movie";
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#edf2ff'/>
          <stop offset='100%' stop-color='#d9e4ff'/>
        </linearGradient>
      </defs>
      <rect width='300' height='450' fill='url(#g)'/>
      <rect x='26' y='26' width='248' height='398' rx='12' fill='none' stroke='#a5b4d6' stroke-width='2'/>
      <text x='150' y='210' text-anchor='middle' font-size='18' font-family='Arial, sans-serif' fill='#2f3f62'>Poster Unavailable</text>
      <text x='150' y='242' text-anchor='middle' font-size='14' font-family='Arial, sans-serif' fill='#4a5e85'>${safeTitle}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const buildQrPayload = (booking) => {
  const movieTitle = booking?.show?.movie?.title || booking?.show?.movie?.name || "Movie";
  const theatreName = booking?.show?.theatre?.name || "N/A";
  const seats = (booking?.seats || []).slice().sort((a, b) => a - b).join(", ");
  const bookingDate = moment(booking?.show?.date).format("MMM Do YYYY");
  const bookingTime = moment(booking?.show?.time, "HH:mm").format("hh:mm A");
  const bookingId = booking?.transactionId || booking?._id;
  return `Booking:${bookingId}|Movie:${movieTitle}|Theatre:${theatreName}|Seats:${seats}|Date:${bookingDate}|Time:${bookingTime}`;
};

const wrapPdfText = (value, maxLength = 52) => {
  const words = String(value || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxLength) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const createPdfBlobFromJpegDataUrl = (jpegDataUrl, width, height) => {
  const base64 = jpegDataUrl.split(",")[1];
  const binaryString = atob(base64);
  const imageBytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    imageBytes[index] = binaryString.charCodeAt(index);
  }

  const encoder = new TextEncoder();
  const parts = [];
  const offsets = [];
  let currentOffset = 0;

  const pushPart = (part) => {
    parts.push(part);
    currentOffset += typeof part === "string" ? encoder.encode(part).length : part.length;
  };

  pushPart("%PDF-1.3\n");

  offsets[1] = currentOffset;
  pushPart("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  offsets[2] = currentOffset;
  pushPart("2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n");

  offsets[3] = currentOffset;
  pushPart(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  offsets[4] = currentOffset;
  pushPart(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`
  );
  pushPart(imageBytes);
  pushPart("\nendstream\nendobj\n");

  const contentStream = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ`;
  offsets[5] = currentOffset;
  pushPart(
    `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`
  );

  const xrefOffset = currentOffset;
  pushPart("xref\n0 6\n");
  pushPart("0000000000 65535 f \n");
  for (let objectNumber = 1; objectNumber <= 5; objectNumber += 1) {
    pushPart(`${String(offsets[objectNumber]).padStart(10, "0")} 00000 n \n`);
  }
  pushPart(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(parts, { type: "application/pdf" });
};

const drawRoundedRect = (ctx, x, y, width, height, radius, fillStyle, strokeStyle = null) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
};

const renderTicketCanvas = async (booking) => {
  const scale = 0.82;
  const baseWidth = 460;
  const baseHeight = 560;
  const movieTitle = booking?.show?.movie?.title || booking?.show?.movie?.name || "Movie";
  const theatreName = booking?.show?.theatre?.name || "N/A";
  const seats = (booking?.seats || []).slice().sort((a, b) => a - b).join(", ") || "N/A";
  const amount = (booking?.seats?.length || 0) * (booking?.show?.ticketPrice || 0);
  const bookingDate = moment(booking?.show?.date).format("MMM Do YYYY");
  const bookingTime = moment(booking?.show?.time, "HH:mm").format("hh:mm A");
  const movieLines = wrapPdfText(movieTitle, 28).slice(0, 2);
  const theatreLines = wrapPdfText(theatreName, 30).slice(0, 2);
  const qrDataUrl = await QRCode.toDataURL(buildQrPayload(booking), {
    width: 180,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  const qrImage = new Image();
  await new Promise((resolve, reject) => {
    qrImage.onload = resolve;
    qrImage.onerror = reject;
    qrImage.src = qrDataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(baseWidth * scale);
  canvas.height = Math.round(baseHeight * scale);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to prepare ticket download");
  }

  ctx.scale(scale, scale);

  const bgGradient = ctx.createLinearGradient(0, 0, baseWidth, baseHeight);
  bgGradient.addColorStop(0, "#0f2745");
  bgGradient.addColorStop(1, "#214c84");
  drawRoundedRect(ctx, 0, 0, baseWidth, baseHeight, 28);
  ctx.fillStyle = bgGradient;
  ctx.fill();
  drawRoundedRect(ctx, 24, 16, 412, 528, 24);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffd27d";
  ctx.font = "700 26px Arial";
  ctx.fillText("Book Tamasha For Me", 60, 102);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 34px Arial";
  ctx.fillText(movieLines[0] || movieTitle, 60, 148);
  if (movieLines[1]) {
    ctx.font = "700 28px Arial";
    ctx.fillText(movieLines[1], 60, 182);
  }

  const accentGradient = ctx.createLinearGradient(60, 0, 460, 0);
  accentGradient.addColorStop(0, "#ffd27d");
  accentGradient.addColorStop(1, "#ffb347");
  ctx.fillStyle = accentGradient;
  drawRoundedRect(ctx, 60, 198, 340, 4, 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "18px Arial";
  ctx.fillText("Theatre", 60, 240);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 22px Arial";
  theatreLines.forEach((line, index) => {
    ctx.fillText(line, 60, 272 + index * 26);
  });

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "18px Arial";
  ctx.fillText("Date & Time", 60, 340);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 20px Arial";
  ctx.fillText(`${bookingDate} | ${bookingTime}`, 60, 372);

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "18px Arial";
  ctx.fillText("Seats", 60, 424);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 20px Arial";
  ctx.fillText(seats, 60, 456);

  drawRoundedRect(ctx, 306, 226, 112, 112, 16, "#ffffff");
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.drawImage(qrImage, 318, 238, 88, 88);

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Amount", 362, 364);
  ctx.fillStyle = "#ffd27d";
  ctx.font = "700 24px Arial";
  ctx.fillText(`Rs. ${amount}`, 362, 396);
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "15px Arial";
  ctx.fillText("Present this QR", 362, 426);

  return canvas;
};

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [qrFallbackMap, setQrFallbackMap] = useState({});
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.users);

  // Old code:
  // const getData = async () => {
  const getData = useCallback(async () => {
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
  }, [dispatch, user?._id]);

  // Old code:
  // useEffect(() => {
  //   getData();
  // }, [user?._id]);
  useEffect(() => {
    getData();
  }, [getData]);

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

  const handlePosterError = (e, title) => {
    const img = e.currentTarget;
    img.onerror = null;
    img.src = buildPosterFallback(title);
  };

  const handleDownloadTicket = async (booking) => {
    try {
      const canvas = await renderTicketCanvas(booking);
      const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const blob = createPdfBlobFromJpegDataUrl(jpegDataUrl, canvas.width, canvas.height);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const movieTitle = booking?.show?.movie?.title || booking?.show?.movie?.name || "movie-ticket";
      const safeMovieTitle = movieTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      anchor.href = objectUrl;
      anchor.download = `${safeMovieTitle || "movie"}-ticket.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      message.error(err?.message || "Unable to download ticket");
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
                          src={booking?.show?.movie?.poster || buildPosterFallback(movieTitle)}
                          alt={movieTitle}
                          className="booking-poster"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={(e) => handlePosterError(e, movieTitle)}
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

                        <div className="booking-ticket-panel">
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
                          <div className="booking-ticket-actions">
                            <Button
                              type="default"
                              className="booking-download-btn"
                              onClick={() => handleDownloadTicket(booking)}
                            >
                              Download Ticket
                            </Button>
                          </div>
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

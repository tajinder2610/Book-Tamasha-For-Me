import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GetMovieById } from "./api/movies";
import { useDispatch } from "react-redux";
import { hideLoading, showLoading } from "../redux/loaderSlice";
import { message, Input, Divider, Row, Col } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import moment from "moment";
import { GetTheatreAndShowsByMovieAndDate } from "./api/shows";

const SingleMovie = () => {
  const params = useParams();
  const [movie, setMovie] = useState();
  const [date, setDate] = useState(moment().format("YYYY-MM-DD"));
  const [theatres, setTheatres] = useState([]);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleDate = (e) => {
    setDate(moment(e.target.value).format("YYYY-MM-DD"));
    navigate(`/movie/${params.id}?date=${e.target.value}`);
  };

  // Old code:
  // const getData = async () => {
  const getData = useCallback(async () => {
    try {
      dispatch(showLoading());
      const response = await GetMovieById(params.id);
      if (response.success) {
        setMovie(response.data);
      } else {
        message.error(response.message);
      }
      dispatch(hideLoading());
    } catch (err) {
      message.error(err.message);
      dispatch(hideLoading());
    }
  }, [dispatch, params.id]);

  // Old code:
  // const getAllTheatres = async () => {
  const getAllTheatres = useCallback(async () => {
    try {
      dispatch(showLoading());
      const response = await GetTheatreAndShowsByMovieAndDate(params.id, date);
      if (response.success) {
        setTheatres(response.data);
      } else {
        message.error(response.message);
      }
      dispatch(hideLoading());
    } catch (err) {
      dispatch(hideLoading());
      message.error(err.message);
    }
  }, [date, dispatch, params.id]);

  // Old code:
  // useEffect(() => {
  //   getData();
  // }, []);
  useEffect(() => {
    getData();
  }, [getData]);

  // Old code:
  // useEffect(() => {
  //   getAllTheatres();
  // }, [date]);
  useEffect(() => {
    getAllTheatres();
  }, [getAllTheatres]);

  return (
    <div style={{ width: "100%" }}>
      {movie && (
        <div className="d-flex single-movie-div">
          <div className="flex-shrink-0 me-3 single-movie-img">
            <img src={movie.poster} width={150} alt="Movie Poster" />
          </div>
          <div className="w-100">
            <h1 className="mt-0">{movie.title}</h1>
            <p className="movie-data">
              Language: <span>{movie.language}</span>
            </p>
            <p className="movie-data">
              Genre: <span>{movie.genre}</span>
            </p>
            <p className="movie-data">
              Release Date:{" "}
              <span>{moment(movie.releaseDate).format("MMM Do YYYY")}</span>
            </p>
            <p className="movie-data">
              Duration: <span>{movie.duration} Minutes</span>
            </p>
            <Divider />
            <div className="d-flex flex-column-mob align-items-center mt-3">
              <label className="me-3 flex-shrink-0">Choose the date:</label>
              <Input
                onChange={handleDate}
                type="date"
                min={moment().format("YYYY-MM-DD")}
                className="max-width-300 mt-8px-mob"
                value={date}
                prefix={<CalendarOutlined />}
              />
            </div>
          </div>
        </div>
      )}

      {theatres.length === 0 && (
        <div className="pt-3">
          <h2 className="blue-clr">
            Currently, no theatres available for this movie!
          </h2>
        </div>
      )}

      {theatres.length > 0 && (
        <div className="theatre-wrapper mt-3 pt-3">
          <h2>Theatres</h2>
          {theatres.map((theatre) => (
            <div key={theatre._id}>
              <Row gutter={24}>
                <Col xs={24} lg={8}>
                  <h3>{theatre.name}</h3>
                  <p>{theatre.address}</p>
                </Col>
                <Col xs={24} lg={16}>
                  <ul className="show-ul">
                    {theatre.shows
                      .sort(
                        (a, b) =>
                          moment(a.time, "HH:mm") - moment(b.time, "HH:mm")
                      )
                      .map((singleShow) => (
                        <li
                          key={singleShow._id}
                          onClick={() =>
                            navigate(`/book-show/${singleShow._id}`)
                          }
                        >
                          {moment(singleShow.time, "HH:mm").format("hh:mm A")}
                        </li>
                      ))}
                  </ul>
                </Col>
              </Row>
              <Divider />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SingleMovie;

import { useDispatch } from "react-redux";
import { showLoading, hideLoading } from "../../../redux/loaderSlice";
import { GetAllMovies } from "../../api/movies";
import { useEffect, useState, useMemo, useCallback } from "react";
import { message, Row, Col, Input, Typography, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import debounce from "lodash.debounce"; // npm install lodash.debounce

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [searchText, setSearchText] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Fetch movies from API
  const getData = useCallback(async () => {
    try {
      dispatch(showLoading());
      const resp = await GetAllMovies();
      if (resp.success) {
        setMovies(resp.data);
      } else {
        message.error(resp.message || "Failed to fetch movies");
      }
    } catch (err) {
      message.error(err?.message || "Something went wrong");
    } finally {
      dispatch(hideLoading());
    }
  }, [dispatch]);

  useEffect(() => {
    getData();
  }, [getData]);

  // Old code:
  // const handleSearch = useCallback(
  //   debounce((value) => {
  //     setSearchText(value);
  //   }, 300),
  //   []
  // );
  const handleSearch = useMemo(
    () =>
      debounce((value) => {
        setSearchText(value);
      }, 300),
    []
  );

  useEffect(() => {
    return () => {
      handleSearch.cancel();
    };
  }, [handleSearch]);

  // Filter movies based on search text
  const filteredMovies = useMemo(() => {
    return movies.filter((movie) =>
      movie.title.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [movies, searchText]);

  return (
    <div className="home-shell">
      <section className="home-search-card">
        <Row justify="center" className="w-100">
          <Col xs={24} lg={12}>
            <Input
              className="home-search-input"
              placeholder="Search movies"
              allowClear
              onChange={(e) => handleSearch(e.target.value)}
              prefix={<SearchOutlined />}
            />
          </Col>
        </Row>
      </section>

      <div className="home-results-head">
        <Typography.Title level={4} className="m-0">
          Now Showing
        </Typography.Title>
        <Tag color="blue">
          {filteredMovies.length} movie{filteredMovies.length !== 1 ? "s" : ""}
        </Tag>
      </div>

      {filteredMovies.length > 0 ? (
        <div className="movie-grid">
          {filteredMovies.map((movie) => (
            <div key={movie._id} className="movie-grid-item">
              <div
                className="movie-card"
                role="button"
                tabIndex={0}
                onClick={() =>
                  navigate(
                    `/movie/${movie._id}?date=${moment().format("YYYY-MM-DD")}`
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    navigate(
                      `/movie/${movie._id}?date=${moment().format("YYYY-MM-DD")}`
                    );
                  }
                }}
              >
                <div className="poster-wrapper cursor-pointer">
                  <img
                    src={movie.poster}
                    alt={`${movie.title} Poster`}
                    className="movie-poster"
                  />
                </div>
                <h3 className="movie-title">{movie.title}</h3>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="home-empty text-center">
          <Typography.Title level={4}>No movies found</Typography.Title>
          <Typography.Paragraph type="secondary">
            Try a different title or clear your search.
          </Typography.Paragraph>
        </div>
      )}
    </div>
  );
};

export default Home;

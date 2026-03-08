import { axiosInstance } from "./index";
//add show
export const AddShow = async (value) => {
  try {
    const response = await axiosInstance.post("/api/shows", value);
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || error.message,
    };
  }
};

// Delete a show
export const DeleteShow = async (showId) => {
  try {
    const response = await axiosInstance.delete(`/api/shows/${showId}`);
    return response.data;
  } catch (err) {
    return {
      success: false,
      message: err?.response?.data?.message || err.message,
    };
  }
};

export const UpdateShow = async (value, showId) => {
  try {
    const response = await axiosInstance.put(`/api/shows/${showId}`, value);
    return response.data;
  } catch (err) {
    return {
      success: false,
      message: err?.response?.data?.message || err.message,
    };
  }
};

//get all theatres by movie and date which has some shows
export const GetTheatreAndShowsByMovieAndDate = async (movie, date) => {
  try {
    const response = await axiosInstance.get(`/api/shows/by-movie-date/${movie}/${date}`);
    return response.data;
  } catch (err) {
    return {
      success: false,
      message: err?.response?.data?.message || err.message,
    };
  }
};

//get all shows by theatre
export const ShowsByTheatre = async (theatreId) => {
  try {
    const response = await axiosInstance.get(`/api/shows/${theatreId}`);
    return response.data;
  } catch (err) {
    return {
      success: false,
      message: err?.response?.data?.message || err.message,
    };
  }
};

export const ShowById = async (showId) => {
  try {
    const response = await axiosInstance.get(`/api/shows/show/${showId}`);
    return response.data;
  } catch (err) {
    return {
      success: false,
      message: err?.response?.data?.message || err.message,
    };
  }
};

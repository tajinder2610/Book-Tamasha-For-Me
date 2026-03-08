import axios from "axios";

export const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "/",
    headers: {
        "Content-Type": "application/json",
        // "withCredentials": true // automatically sends cookies with req
        "authorization": `Bearer ${localStorage.getItem("token")}`
    }
});

axiosInstance.interceptors.request.use(function (config) {
    const token = localStorage.getItem("token");
    config.headers.authorization =  `Bearer ${token}`;
    return config;
});

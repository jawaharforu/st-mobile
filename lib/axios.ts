import axios from "axios";

// Environment variable for API URL
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("token"); // Consistency
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Handle 401 (Unauthorized) and 403 (Forbidden)
        if (error.response?.status === 401 || error.response?.status === 403) {
            if (typeof window !== "undefined") {
                localStorage.removeItem("token");
                window.location.href = "/"; // Redirect to root/login
            }
        }
        return Promise.reject(error);
    }
);

export default api;

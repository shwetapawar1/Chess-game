import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api/v1",
  withCredentials: true,
});

// interceptor
// 1. there is an error in any api
// 2. If status code == 401 (Unauthorized)
// 3. hit the /auth/refresh endpoint
// 4. After returning from the refresh endpoint, rehit the original endpoint
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRefreshCall = originalRequest?.url?.includes("/auth/refresh");
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isRefreshCall
    ) {
      originalRequest._retry = true;
      try {
        await api.post("/auth/refresh");
        // retry the original request
        return api(originalRequest);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  },
);

export { api };
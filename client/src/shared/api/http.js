import axios from "axios";

// Gemensam HTTP-klient för alla feature-API:n.
// Backend svarar alltid { success, message, data } — vi packar upp data
// så att anropskoden slipper bry sig om kuvertet.
const http = axios.create({
    baseURL: "/api",
    withCredentials: true
});

http.interceptors.response.use(
    (response) => response.data?.data ?? {},
    (error) => {
        const normalized = new Error(
            error.response?.data?.message || "Något gick fel. Försök igen."
        );

        normalized.status = error.response?.status ?? 0;

        return Promise.reject(normalized);
    }
);

export default http;

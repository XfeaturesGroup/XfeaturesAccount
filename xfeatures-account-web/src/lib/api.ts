import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

api.interceptors.request.use((config) => {
    config.headers['X-Request-Start'] = Date.now().toString();
    return config;
});

api.interceptors.response.use(
    (response) => {
        const startTime = Number(response.config.headers['X-Request-Start']);
        const latency = Date.now() - startTime;

        window.dispatchEvent(new CustomEvent('system_log', {
            detail: { type: 'success', msg: `${response.config.method?.toUpperCase()} ${response.config.url} [${latency}ms]` }
        }));

        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            window.dispatchEvent(new Event('auth_unauthorized'));
        }

        const errorMsg = error.response?.data?.error || error.message;
        window.dispatchEvent(new CustomEvent('system_log', {
            detail: { type: 'error', msg: `ERR: ${errorMsg}` }
        }));

        return Promise.reject(error);
    }
);
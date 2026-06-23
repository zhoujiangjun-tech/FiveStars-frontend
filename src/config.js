// 后端服务地址配置(指向 Render 部署地址)
// 本地开发时可改回 'http://localhost:4800'
export const API_URL = "https://fivestars-backend.onrender.com";
export const SOCKET_URL = "https://fivestars-backend.onrender.com";

// 兼容旧代码(默认导出)
const config = {
  API_BASE_URL: API_URL,
  SOCKET_URL: SOCKET_URL,
};
export default config;

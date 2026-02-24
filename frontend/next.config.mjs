/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/daily-todo-cloud',
  trailingSlash: true,
};

export default nextConfig;

import handler from './index.js';

export default async function botHandler(req, res) {
  // Directly forward to the unified API handler
  return handler(req, res);
}

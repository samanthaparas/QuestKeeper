// GET /api/health: a quick "is the API alive?" check, for a person or a
// monitoring tool. It answers straight away without asking any outside
// service, so it's cheap to call as often as needed.
//
// It says whether the AI features (search by meaning, recap drafts, group
// summaries) are set up, as a yes or no only. The key itself is never sent.

const startedAt = Date.now();

export function getHealth(req, res) {
  res.status(200).json({
    status: "ok",
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    aiFeatures: process.env.ANTHROPIC_API_KEY ? "set up" : "not set up",
  });
}

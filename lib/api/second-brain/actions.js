import { json } from "../../open-brain/helpers.js";
import importLlmShareAction from "./import-llm-share.js";

const POST_ACTION_HANDLERS = {
  "import-llm-share": importLlmShareAction,
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const action = String(req.query?.action || "")
    .trim()
    .toLowerCase();
  const actionHandler = POST_ACTION_HANDLERS[action];
  if (actionHandler) return actionHandler(req, res);

  return json(res, 404, { error: "Not found" });
}

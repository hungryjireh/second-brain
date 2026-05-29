import brainstormHandler from "./brainstorm.js";
import brainstormTalkActionsHandler from "./brainstorm-talk-actions.js";

export default async function handler(req, res) {
  const action = String(req.query?.action || "")
    .trim()
    .toLowerCase();

  if (action === "transcribe" || action === "synthesize") {
    return brainstormTalkActionsHandler(req, res);
  }

  return brainstormHandler(req, res);
}

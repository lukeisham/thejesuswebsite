// Publish HTTP routes. Flips an entity's published_draft flag by delegating to
// that entity's own model — this route owns no SQL of its own. Admin only.

const express = require("express");

const evidenceModel = require("../models/evidence.model");
const essayModel = require("../models/essay.model");
const responseModel = require("../models/response.model");
const historiographyModel = require("../models/historiography.model");
const blogPostModel = require("../models/blog-post.model");
const newsArticleModel = require("../models/news-article.model");
const wikipediaModel = require("../models/wikipedia.model");
const popularChallengesModel = require("../models/popular-challenges.model");
const academicChallengesModel = require("../models/academic-challenges.model");
const collectionModel = require("../models/collection.model");
const requireAuth = require("../middleware/auth");
const { generatePage, removePage } = require("../services/page-generator");
const ERRORS = require("../lib/error-codes");
const { sendError } = require("../lib/error-handler");

const router = express.Router();

// Map a URL-friendly type to the model that knows how to update it. Only entities
// carrying a published_draft flag appear here (JS-2: an unknown type is rejected,
// never guessed).
const MODELS = {
  evidence: evidenceModel,
  essays: essayModel,
  responses: responseModel,
  historiography: historiographyModel,
  "blog-posts": blogPostModel,
  "news-articles": newsArticleModel,
  wikipedia: wikipediaModel,
  "popular-challenges": popularChallengesModel,
  "academic-challenges": academicChallengesModel,
  collections: collectionModel,
};

// Shared handler for both publish (1) and unpublish (0): resolve the model,
// validate the id, then reuse the entity's own update().
function setPublished(req, res, publishedDraft) {
  // JS-2: resolve by real, enumerable own keys only. A plain-object bracket
  // lookup also returns inherited Object.prototype keys (constructor,
  // toString, etc.) which would cause a 500 at the model call below.
  if (!Object.hasOwn(MODELS, req.params.type))
    return sendError(res, ERRORS.UNKNOWN_ENTITY_TYPE, { type: req.params.type });

  const model = MODELS[req.params.type];

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return sendError(res, ERRORS.INVALID_NUMERIC_PARAM, {
      field: "id",
      received: req.params.id,
    });
  }

  const updated = model.update(id, { published_draft: publishedDraft });
  if (!updated)
    return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
      entity: req.params.type,
      id,
    });

  // Generate or remove the static page for this content item (JS-2: failure
  // to generate the static page is logged but does not roll back the publish
  // — the item is live; the page can be regenerated via npm run pages).
  const pageType = req.params.type;
  const slug = updated.slug;
  if (slug) {
    if (publishedDraft === 1) {
      generatePage(pageType, slug);
    } else {
      removePage(pageType, slug);
    }
  }

  return res.json(updated);
}

// POST /publish/:type/:id — make an item live
router.post("/:type/:id", requireAuth, (req, res) => {
  try {
    setPublished(req, res, 1);
  } catch (error) {
    console.error("POST /publish failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// DELETE /publish/:type/:id — return an item to draft
router.delete("/:type/:id", requireAuth, (req, res) => {
  try {
    setPublished(req, res, 0);
  } catch (error) {
    console.error("DELETE /publish failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;

import { NextApiHandler } from "next";
import {
  query,
  buildStatementForUpdate,
  buildStatementForDelete,
  getColumnValue,
} from "../../../lib/db";
import { templateTableName } from "../../../lib/constants";
import {
  getMarkdownForTemplate,
  deleteMarkdownByTemplate,
  storeMarkdownForTemplate,
} from "../../../lib/markdown";
import {
  deleteCategoryByTemplate,
  storeCategoryForTemplate,
  getCategoryForTemplate,
} from "../../../lib/category";
import { deleteReviewByTemplate } from "../../../lib/review";
import { getTemplateById, storeTemplate } from "../../../lib/template";

const validID = async (id: number) => {
  if (!id) {
    return false;
  }
  if (typeof parseInt(id.toString()) !== "number") {
    return false;
  }
  return true;
};

const deleteTemplate = async (req, res) => {
  const { id } = req.query;
  try {
    if (!validID(id)) {
      return res.status(400).json({ message: "invalid `id`" });
    }
    if (!(await validateTemplateByID(id))) {
      res.status(404).json({ message: "template not found" });
      return;
    }
    await deleteMarkdownByTemplate(id);
    await deleteCategoryByTemplate(id);
    await deleteReviewByTemplate(id);
    let { statement, values } = buildStatementForDelete(templateTableName, id);
    await query(statement, values);

    res.status(200).json({ message: "template deleted" });
    return;
  } catch (e) {
    res.status(500).json({ message: e.message });
    return;
  }
};

const validateTemplateByID = async (id: number) => {
  const results = await getTemplateById(id);
  if (Object.keys(results).length == 0) {
    return false;
  }
  return true;
};

const _getTemplate = async (id) => {
  const results = (await getTemplateById(id)) as any[];
  if (results.length == 0) {
    return null;
  }
  let result = results[0];
  const markdowns = await getMarkdownForTemplate(result.id);
  const categories = await getCategoryForTemplate(result.id);
  result["markdowns"] = markdowns;
  result["categories"] = categories;
  return result;
};

const getTemplate = async (req, res) => {
  const { id } = req.query;
  try {
    if (!validID(id)) {
      return res.status(400).json({ message: "invalid `id`" });
    }
    const result = await _getTemplate(id);
    if (!result) {
      res.status(404).json({ message: "template not found" });
      return;
    }
    return res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
    return;
  }
};

const copyTemplate = async (req, res) => {
  const { id, user } = req.query;
  try {
    if (!validID(id)) {
      return res.status(400).json({ message: "invalid `id`" });
    }
    let kv = await _getTemplate(id);
    if (!kv) {
      res.status(404).json({ message: "template not found" });
      return;
    }
    kv["creator"] = user;
    kv["name"] = kv["name"] + " - copy";
    kv["used"] = 0;
    kv["likes"] = 0;
    kv["total_rate"] = 0;
    kv["rate_count"] = 0;
    kv["rate"] = 0;
    delete kv["created_at"];
    if (kv["subject"] == null) {
      delete kv["subject"];
    }
    const resultID = await storeTemplate(kv);
    return res.json({ id: resultID });
  } catch (e) {
    res.status(500).json({ message: e.message });
    return;
  }
};

const updateTemplate = async (req, res) => {
  const { id } = req.query;
  try {
    if (!validID(id)) {
      res.status(400).json({ message: "invalid `id`" });
      return;
    }
    if (!(await validateTemplateByID(id))) {
      res.status(404).json({ message: "template not found" });
      return;
    }
    const key_value = getColumnValue(req.body, [
      "name",
      "creator",
      "html",
      "design",
      "subject",
      "shared",
    ]);
    let { statement, values } = buildStatementForUpdate(
      key_value,
      templateTableName,
      id
    );
    await query(statement, values);
    if ("markdowns" in req.body) {
      await deleteMarkdownByTemplate(id);
      for (const markdown of req.body["markdowns"]) {
        const { name, type, default_value } = markdown;
        if (name) {
          await storeMarkdownForTemplate(name, type, id, default_value);
        }
      }
    }
    if ("categories" in req.body) {
      await deleteCategoryByTemplate(id);
      for (const category of req.body["categories"]) {
        await storeCategoryForTemplate(category, id);
      }
    }

    res.status(200).json({ message: "template updated" });
    return;
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
    return;
  }
};

/**
 * Handler to create template
 * @param  {req} req - request
 * @param  {res} res - response
 */
const templateHandler: NextApiHandler = async (req, res) => {
  const method = req.method;

  switch (method) {
    case "POST":
      return await copyTemplate(req, res);
    case "GET":
      return await getTemplate(req, res);
    case "PUT":
      return await updateTemplate(req, res);
    case "DELETE":
      return await deleteTemplate(req, res);
    default:
      res.setHeader("Allow", ["POST", "GET", "PUT", "DELETE"]);
      res.status(405).end(`Method ${method} Not Allowed`);
      return;
  }
};

export default templateHandler;

import { NextApiHandler } from "next";
import Filter from "bad-words";
import { query, buildStatementForInsert, getColumnValue } from "../../lib/db";
import { templateTableName } from "../../lib/constants";
import { storeMarkdownForTemplate } from "../../lib/markdown";
import { storeCategoryForTemplate } from "../../lib/category";

const filter = new Filter();

const createTemplateHandler: NextApiHandler = async (req, res) => {
  if (req.method != "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }
  const { name, creator, html, design, markdowns, categories } = req.body;
  try {
    if (!name || !creator || !html || !design) {
      return res.status(400).json({
        message: "`name`, `creator`, `html` and `design` are required",
      });
    }
    const key_value = getColumnValue(req.body, [
      "name",
      "creator",
      "html",
      "design",
      "subject",
    ]);
    const { statement, values } = buildStatementForInsert(
      key_value,
      templateTableName
    );
    const results = await query(statement, values);
    const id = results["insertId"];
    if (markdowns) {
      for (const markdown of markdowns) {
        const { name, type, default_value } = markdown;
        if (name) {
          await storeMarkdownForTemplate(name, type, id, default_value);
        }
      }
    }
    if (categories) {
      for (const category of categories) {
        await storeCategoryForTemplate(category, id);
      }
    }
    return res.json({ id: id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
};

export default createTemplateHandler;

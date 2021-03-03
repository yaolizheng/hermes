import mysql from "serverless-mysql";
import Filter from "bad-words";

const filter = new Filter();

export const db = mysql({
  config: {
    host: process.env.MYSQL_HOST,
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    port: parseInt(process.env.MYSQL_PORT),
  },
});

export async function query(
  q: string,
  values: (string | number)[] | string | number = []
) {
  try {
    const results = await db.query(q, values);
    await db.end();
    return results;
  } catch (e) {
    console.log(e);
    throw Error(e.message);
  }
}

export function getColumnValue(key_value: object, columns: string[]) {
  let res = {};
  columns.forEach((item) => {
    if (item in key_value) {
      if (key_value[item] instanceof Object) {
        res[item] = JSON.stringify(key_value[item]);
      } else {
        res[item] = key_value[item];
      }
    }
  });
  return res;
}

export function getColumnValueForSearch(key_value: object, columns: object) {
  let res = {};
  Object.keys(columns).forEach((key) => {
    if (key in key_value) {
      res[columns[key]["col"]] = {
        value: key_value[key],
        include: columns[key]["include"],
      };
    }
  });
  return res;
}

export function buildStatementForUpdate(
  key_value: {},
  table: string,
  id: number
) {
  let statement = "UPDATE ";
  statement += table;
  statement += " SET ";
  let values = [] as string[];
  let attrs = [] as string[];
  Object.keys(key_value).forEach((key) => {
    attrs.push(key + " = ?");
    values.push(filter.clean(String(key_value[key])));
  });
  statement += attrs.join(",");
  statement += " WHERE id = ?";
  values.push(filter.clean(String(id)));
  return { statement: statement, values: values };
}

export function buildStatementForQuery(
  key_value: {},
  table: string,
  order_by: string = undefined,
  sort_by: string = "ASC",
  limit: number = undefined,
  offset: number = undefined
) {
  let statement = "SELECT * FROM ";
  statement += table;

  let values = [] as string[];
  let attrs = [] as string[];
  Object.keys(key_value).forEach((key) => {
    let { value, include } = key_value[key];
    if (value instanceof Array) {
      let sub_attrs = [] as string[];
      value.forEach((item) => {
        sub_attrs.push("?");
        values.push(filter.clean(String(item)));
      });
      if (include) {
        attrs.push(key + " in (" + sub_attrs.join(",") + ")");
      } else {
        attrs.push(key + " not in (" + sub_attrs.join(",") + ")");
      }
    } else {
      if (include) {
        attrs.push(key + "= ?");
      } else {
        attrs.push(key + "!= ?");
      }
      values.push(filter.clean(String(value)));
    }
  });
  if (attrs.length > 0) {
    statement += " WHERE ";
    statement += attrs.join(" AND ");
  }
  if (order_by != undefined) {
    statement += " ORDER BY ";
    statement += order_by;
    statement += " ";
    statement += sort_by;
  }
  if (limit != undefined) {
    statement += " LIMIT ";
    statement += limit;
  }
  if (offset != undefined) {
    statement += " OFFSET ";
    statement += offset;
  }
  return { statement: statement, values: values };
}

export function buildStatementForQueryByID(table: string, id: number) {
  let statement = "SELECT * FROM ";
  statement += table;
  statement += " WHERE id = ?";
  let values = [filter.clean(String(id))];
  return { statement: statement, values: values };
}

export async function getTemplateMarkdownByIDs(
  template_id: any,
  markdown_id: any
) {
  let statement =
    "SELECT * FROM template_markdown WHERE template_id = ? AND markdown_id = ?";
  let values = [
    filter.clean(String(template_id)),
    filter.clean(String(markdown_id)),
  ];
  return await query(statement, values);
}

export async function getMarkdownByNameAndType(name: any, type: any) {
  let statement = "SELECT * FROM markdown WHERE name = ? AND type = ?";
  let values = [filter.clean(String(name)), filter.clean(String(type))];
  return await query(statement, values);
}

export function buildStatementForDelete(table: string, id: number) {
  let statement = "DELETE FROM ";
  statement += table;
  statement += " WHERE id = ?";
  let values = [filter.clean(String(id))];
  return { statement: statement, values: values };
}

export function buildStatementForInsert(key_value: {}, table: string) {
  let statement = "INSERT INTO ";
  statement += table;
  let values = [] as string[];
  let keys = [] as string[];
  let attrs = [] as string[];
  Object.keys(key_value).forEach((key) => {
    if (String(key_value[key])) {
      attrs.push("?");
      keys.push(key);
      values.push(filter.clean(String(key_value[key])));
    }
  });
  statement += " ( ";
  statement += keys.join(",");
  statement += " ) VALUES ( ";
  statement += attrs.join(",");
  statement += " )";
  return { statement: statement, values: values };
}

export async function truncateTable(table: string) {
  try {
    await query("SET FOREIGN_KEY_CHECKS = 0");
    await query("TRUNCATE TABLE " + table);
    await query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("truncated table " + table);
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
}

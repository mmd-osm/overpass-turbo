// ffs/wizard module
import ffs_free from "./ffs/free";
import ffs_parser from "./ffs/ffs.pegjs";

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
let freeFormQuery;

type Query = {
  logical: "or" | "xor" | "minus" | "and";
  queries: Query[];
};

/* this converts a random boolean expression into a normalized form:
 * A∧B∧… ∨ C∧D∧… ∨ …
 * for example: A∧(B∨C) ⇔ (A∧B)∨(A∧C)
 */
function normalize(query: Query): Query {
  function normalize_recursive(rem_query: Query): Query[] {
    if (!rem_query.logical) {
      return [
        {
          logical: "and",
          queries: [rem_query]
        }
      ];
    } else if (rem_query.logical === "and") {
      const c1 = normalize_recursive(rem_query.queries[0]);
      const c2 = normalize_recursive(rem_query.queries[1]);
      // return cross product of c1 and c2
      return c1.flatMap((c1i) =>
        c2.map((c2j) => ({
          logical: "and",
          queries: c1i.queries.concat(c2j.queries)
        }))
      );
    } else if (rem_query.logical === "or") {
      const c1 = normalize_recursive(rem_query.queries[0]);
      const c2 = normalize_recursive(rem_query.queries[1]);
      return [].concat(c1, c2);
    } else {
      alert(`unsupported boolean operator: ${rem_query.logical}`);
    }
  }
  return {
    logical: "or",
    queries: normalize_recursive(query)
  };
}

function escRegexp(str) {
  return str.replace(/([()[{*+.$^\\|?])/g, "\\$1");
}

export function ffs_construct_query(
  search: string,
  comment: string | false | undefined,
  callback
) {
  function quote_comment_str(s) {
    // quote strings that are to be used within c-style comments
    // replace any comment-ending sequences in these strings that would break the resulting query
    return s.replace(/\*\//g, "[…]").replace(/\n/g, "\\n");
  }

  let ffs;
  try {
    ffs = ffs_parser.parse(search);
  } catch (e) {
    console.warn("ffs parse error", e);
    return callback("ffs parse error");
  }

  const query_parts = [];
  let bounds_part;

  function add_comment(string) {
    if (comment !== false) {
      query_parts.push(string);
    }
  }

  add_comment("/*");
  if (typeof comment === "string") {
    add_comment(comment);
  } else {
    add_comment("This has been generated by the overpass-turbo wizard.");
    add_comment("The original search was:");
    add_comment(`“${quote_comment_str(search)}”`);
  }
  add_comment("*/");
  query_parts.push("[out:json][timeout:25];");

  switch (ffs.bounds) {
    case "area":
      add_comment(`// fetch area “${ffs.area}” to search in`);
      query_parts.push(`{{geocodeArea:${ffs.area}}}->.searchArea;`);
      bounds_part = "(area.searchArea)";
      break;
    case "around":
      add_comment("// adjust the search radius (in meters) here");
      query_parts.push("{{radius=1000}}");
      bounds_part = `(around:{{radius}},{{geocodeCoords:${ffs.area}}})`;
      break;
    case "bbox":
      bounds_part = "({{bbox}})";
      break;
    case "global":
      bounds_part = undefined;
      break;
    default:
      alert(`unknown bounds condition: ${ffs.bounds}`);
      return false;
  }

  function get_query_clause(condition) {
    function esc(str) {
      if (typeof str !== "string") return;
      // see http://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL#Escaping
      return str
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"') // need to escape those
        .replace(/\t/g, "\\t")
        .replace(/\n/g, "\\n"); // also escape newlines an tabs for better readability of the query
    }
    let key = esc(condition.key);
    const val = esc(condition.val);
    // convert substring searches into matching regexp ones
    if (condition.query === "substr") {
      condition.query = "like";
      condition.val = {regex: escRegexp(condition.val)};
    }
    // special case for empty values
    // see https://github.com/drolbr/Overpass-API/issues/53
    if (val === "") {
      if (condition.query === "eq") {
        condition.query = "like";
        condition.val = {regex: "^$"};
      } else if (condition.query === "neq") {
        condition.query = "notlike";
        condition.val = {regex: "^$"};
      }
    }
    // special case for empty keys
    // see https://github.com/drolbr/Overpass-API/issues/53#issuecomment-26325122
    if (key === "") {
      if (condition.query === "key") {
        condition.query = "likelike";
        key = "^$";
        condition.val = {regex: ".*"};
      } else if (condition.query === "eq") {
        condition.query = "likelike";
        key = "^$";
        condition.val = {regex: `^${escRegexp(condition.val)}$`};
      } else if (condition.query === "like") {
        condition.query = "likelike";
        key = "^$";
      }
    }
    // construct the query clause
    switch (condition.query) {
      case "key":
        return `["${key}"]`;
      case "nokey":
        return `[!"${key}"]`;
      case "eq":
        return `["${key}"="${val}"]`;
      case "neq":
        return `["${key}"!="${val}"]`;
      case "like":
        return `["${key}"~"${esc(condition.val.regex)}"${
          condition.val.modifier === "i" ? ",i" : ""
        }]`;
      case "likelike":
        return `[~"${key}"~"${esc(condition.val.regex)}"${
          condition.val.modifier === "i" ? ",i" : ""
        }]`;
      case "notlike":
        return `["${key}"!~"${esc(condition.val.regex)}"${
          condition.val.modifier === "i" ? ",i" : ""
        }]`;
      case "meta":
        switch (condition.meta) {
          case "id":
            return `(${val})`;
          case "newer":
            if (
              condition.val.match(
                /^-?\d+ ?(seconds?|minutes?|hours?|days?|weeks?|months?|years?)?$/
              )
            )
              return `(newer:"{{date:${val}}}")`;
            return `(newer:"${val}")`;
          case "user":
            return `(user:"${val}")`;
          case "uid":
            return `(uid:${val})`;
          default:
            console.log(`unknown query type: meta/${condition.meta}`);
            return false;
        }
      case "free form":
      // own module, special cased below
      // falls through
      default:
        console.log(`unknown query type: ${condition.query}`);
        return false;
    }
  }
  function get_query_clause_str(condition) {
    function quotes(s) {
      if (s.match(/^[a-zA-Z0-9_]+$/) === null)
        return `"${s.replace(/"/g, '\\"')}"`;
      return s;
    }
    function quoteRegex(s) {
      if (s.regex.match(/^[a-zA-Z0-9_]+$/) === null || s.modifier)
        return `/${s.regex.replace(/\//g, "\\/")}/${s.modifier || ""}`;
      return s.regex;
    }
    switch (condition.query) {
      case "key":
        return quote_comment_str(`${quotes(condition.key)}=*`);
      case "nokey":
        return quote_comment_str(`${quotes(condition.key)}!=*`);
      case "eq":
        return quote_comment_str(
          `${quotes(condition.key)}=${quotes(condition.val)}`
        );
      case "neq":
        return quote_comment_str(
          `${quotes(condition.key)}!=${quotes(condition.val)}`
        );
      case "like":
        return quote_comment_str(
          `${quotes(condition.key)}~${quoteRegex(condition.val)}`
        );
      case "likelike":
        return quote_comment_str(
          `~${quotes(condition.key)}~${quoteRegex(condition.val)}`
        );
      case "notlike":
        return quote_comment_str(
          `${quotes(condition.key)}!~${quoteRegex(condition.val)}`
        );
      case "substr":
        return quote_comment_str(
          `${quotes(condition.key)}:${quotes(condition.val)}`
        );
      case "meta":
        switch (condition.meta) {
          case "id":
            return quote_comment_str(`id:${quotes(condition.val)}`);
          case "newer":
            return quote_comment_str(`newer:${quotes(condition.val)}`);
          case "user":
            return quote_comment_str(`user:${quotes(condition.val)}`);
          case "uid":
            return quote_comment_str(`uid:${quotes(condition.val)}`);
          default:
            return "";
        }
      case "free form":
        return quote_comment_str(quotes(condition.free));
      default:
        return "";
    }
  }

  ffs.query = normalize(ffs.query);

  let freeForm = false;
  for (const and_query of ffs.query.queries) {
    for (const cond_query of and_query.queries) {
      if (cond_query.query === "free form") {
        freeForm = true;
        break;
      }
    }
  }

  // if we have a "free form" query part, need to load it before first use:
  (freeForm ? ffs_free : (x) => x(null))((freeFormQuery) => {
    add_comment("// gather results");
    query_parts.push("(");
    for (const and_query of ffs.query.queries) {
      let types = ["node", "way", "relation"];
      let clauses = [];
      let clauses_str = [];
      for (const cond_query of and_query.queries) {
        // todo: looks like some code duplication here could be reduced by refactoring
        if (cond_query.query === "free form") {
          const ffs_clause = freeFormQuery.get_query_clause(cond_query);
          if (ffs_clause === false) return callback("unknown ffs string");
          // restrict possible data types
          types = types.filter((t) => ffs_clause.types.indexOf(t) != -1);
          // add clauses
          clauses_str.push(get_query_clause_str(cond_query));
          clauses = clauses.concat(
            ffs_clause.conditions.map((condition) =>
              get_query_clause(condition)
            )
          );
        } else if (cond_query.query === "type") {
          // restrict possible data types
          types = types.indexOf(cond_query.type) != -1 ? [cond_query.type] : [];
        } else {
          // add another query clause
          clauses_str.push(get_query_clause_str(cond_query));
          const clause = get_query_clause(cond_query);
          if (clause === false) return false;
          clauses.push(clause);
        }
      }
      clauses_str = clauses_str.join(" and ");

      // construct query
      add_comment(`  // query part for: “${clauses_str}”`);
      if (types.length === 3) {
        types = ["nwr"];
        add_comment("  // nwr is short for node/way/relation");
      }
      for (const t of types) {
        let buffer = `  ${t}`;
        for (const c of clauses) buffer += c;
        if (bounds_part) buffer += bounds_part;
        buffer += ";";
        query_parts.push(buffer);
      }
    }
    query_parts.push(");");

    add_comment("// print results");
    query_parts.push("out body;");
    query_parts.push(">;");
    query_parts.push("out skel qt;");

    callback(null, query_parts.join("\n"));
  });
}

/**
 * this is a "did you mean …" mechanism against typos in preset names
 */
export function ffs_repair_search(search: string, callback) {
  let ffs;
  try {
    ffs = ffs_parser.parse(search);
  } catch (e) {
    return callback(false);
  }

  function quotes(s) {
    if (s.match(/^[a-zA-Z0-9_]+$/) === null)
      return `"${s.replace(/"/g, '\\"')}"`;
    return s;
  }

  let search_parts = [];
  let repaired = false;

  ffs_free((freeFormQuery) => {
    ffs.query = normalize(ffs.query);
    ffs.query.queries.forEach((q) => {
      q.queries.forEach(validateQuery);
    });
    function validateQuery(cond_query) {
      if (cond_query.query === "free form") {
        const ffs_clause = freeFormQuery.get_query_clause(cond_query);
        if (ffs_clause === false) {
          // try to find suggestions for occasional typos
          const fuzzy = freeFormQuery.fuzzy_search(cond_query);
          let free_regex = null;
          try {
            free_regex = new RegExp(`['"]?${escRegexp(cond_query.free)}['"]?`);
          } catch (e) {}
          if (fuzzy && search.match(free_regex)) {
            search_parts = search_parts.concat(search.split(free_regex));
            search = search_parts.pop();
            const replacement = quotes(fuzzy);
            search_parts.push(replacement);
            repaired = true;
          }
        }
      }
    }
    search_parts.push(search);

    if (!repaired) callback(false);
    else callback(search_parts);
  });
}

export function ffs_invalidateCache() {
  freeFormQuery = undefined;
}

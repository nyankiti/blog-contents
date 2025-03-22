import { remark } from "remark";
import remarkParse from "remark-parse";
import strip from "strip-markdown";
import { Parent } from "unist";

const removeBookmarkImport = (text: string) => {
  return text.replace(/^import { Bookmark } from ["'].*["'];?\n?/gm, "");
};

const cleanMarkdown = async (content: string) => {
  const result = await remark()
    .use(remarkParse)
    .use(() => (tree) => {
      // headingを削除
      (tree as Parent).children = (tree as Parent).children.filter(
        (node) => node.type !== "heading"
      );
    })
    .use(strip)
    .process(content);
  return String(result);
};

export const generatePostsDescription = async (content: string) => {
  const cleaned = await cleanMarkdown(content);
  const cleanedWithoutBookmarkImport = removeBookmarkImport(cleaned);
  return cleanedWithoutBookmarkImport.slice(0, 140);
};

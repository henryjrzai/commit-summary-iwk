import sanitizeHtml from "sanitize-html";

export function sanitizeSummaryHtml(unsafeHtml: string): string {
  return sanitizeHtml(unsafeHtml, {
    allowedTags: ["h2", "h3", "p", "ul", "ol", "li", "strong", "em", "br"],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  });
}


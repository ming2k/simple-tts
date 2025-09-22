export class TextProcessor {

  escapeXmlChars(text) {
    const xmlChars = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return text.replace(/[<>&'"]/g, (char) => xmlChars[char] || char);
  }
}
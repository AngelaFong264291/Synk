const parseXML = (xml) => {
  const stack = [{ _children: [] }];
  const tagRegex = /<([^>]+)>/g;
  let match;
  let lastIndex = 0;

  while ((match = tagRegex.exec(xml)) !== null) {
    const text = xml.slice(lastIndex, match.index).trim();
    if (text) {
      stack.at(-1)._children.push(text);
    }

    const tagContent = match[1];
    if (tagContent.startsWith("?")) {
      lastIndex = tagRegex.lastIndex;
      continue;
    }

    if (tagContent.startsWith("/")) {
      stack.pop();
    } else {
      const isSelfClosing = tagContent.endsWith("/");
      const cleanTag = isSelfClosing ? tagContent.slice(0, -1).trim() : tagContent.trim();
      
      const parts = cleanTag.match(/([^\s=]+)(?:="([^"]*)")?/g) || [];
      const tagName = parts.shift();
      const obj = { _tag: tagName, _children: [] };

      for (const part of parts) {
        const eqIndex = part.indexOf('=');
        if (eqIndex !== -1) {
          const name = part.substring(0, eqIndex);
          let value = part.substring(eqIndex + 1);
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          }
          obj[name] = value;
        }
      }

      stack.at(-1)._children.push(obj);
      if (!isSelfClosing) {
        stack.push(obj);
      }
    }
    lastIndex = tagRegex.lastIndex;
  }

  return stack[0]._children;
};

export default parseXML;

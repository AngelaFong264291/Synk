import parseXML from "./parseXML.js";
import ZIPExtractor from "./extractZIP.js";

const getChild = (parent, tag) => {
  if (!parent) return parent;
  return parent._children.find((c) => c._tag === tag);
};

const getFirstChild = (parent, tags) => {
  if (!parent) return parent;
  return parent._children.find((c) => tags.includes(c._tag));
};

const getText = (element) => {
  return element?._children?.filter((c) => typeof c === "string").join("") || "";
};

const useProperty = (parent, path, found, notFound = null) => {
  const property = path.pop();
  const target = path.reduce(getChild, parent);
  if (target?.[property]) found(target[property]);
  else if (notFound) notFound();
};

const emuToPt = (emu) => {
  return Number((emu / 12700).toFixed(3));
};

const getChildByTag = (parent, tag) => {
  if (!parent || !parent._children) return null;
  return parent._children.find((c) => c._tag === tag || (c._tag && c._tag.endsWith(":" + tag)));
};

const getChildrenByTag = (parent, tag) => {
  if (!parent || !parent._children) return [];
  return parent._children.filter((c) => c._tag === tag || (c._tag && c._tag.endsWith(":" + tag)));
};

const findDeep = (parent, tag) => {
  if (!parent || !parent._children) return null;
  for (const child of parent._children) {
    if (child._tag === tag || (child._tag && child._tag.endsWith(":" + tag))) return child;
    const found = findDeep(child, tag);
    if (found) return found;
  }
  return null;
};

const processParagraph = async (p, media, listLevel) => {

  let html = "";

  const pProperties = getChildByTag(p, "pPr");

  let pTag = "p";
  let pStyle = "";
  let pText = "";

  // Set HTML tag to h* for "Heading" styles
  const pStyleVal = getChildByTag(pProperties, "pStyle")?.["w:val"] || getChildByTag(pProperties, "pStyle")?.["val"];
  if (pStyleVal && pStyleVal.startsWith("Heading")) {
    pTag = "h" + pStyleVal.slice(7);
  }

  // Translate text-align style
  const jcVal = getChildByTag(pProperties, "jc")?.["w:val"] || getChildByTag(pProperties, "jc")?.["val"];
  if (jcVal) {
    let direction = jcVal;
    if (direction === "both") direction = "justify";
    if (direction !== "left") {
      pStyle += `text-align:${direction};`;
    }
  }

  // Handle unordered list depth
  const numPr = getChildByTag(pProperties, "numPr");
  const numberingId = getChildByTag(numPr, "numId")?.["w:val"] || getChildByTag(numPr, "numId")?.["val"];
  
  if (numberingId && numberingId != 0) {
    const levelVal = getChildByTag(numPr, "ilvl")?.["w:val"] || getChildByTag(numPr, "ilvl")?.["val"];
    if (levelVal !== undefined && !isNaN(levelVal)) {
      let level = Number(levelVal);

      if (level > listLevel) {
        for (let i = listLevel; i < level; i ++) html += "<ul>";
      } else {
        for (let i = level; i < listLevel; i ++) html += "</ul>";
      }

      pTag = "li";
      listLevel = level;
    }
  } else if (listLevel !== -1) {
    for (let i = -1; i < listLevel; i ++) html += "</ul>";
    listLevel = -1;
  }

  for (const r of p._children.filter(c => typeof c !== "string" && (c._tag === "w:r" || (c._tag && c._tag.endsWith(":r"))))) {

    // Handle images
    const drawings = getChildrenByTag(r, "drawing");
    for (const drawing of drawings) {
      const blip = findDeep(drawing, "blip");
      const embedId = blip?.["r:embed"] || blip?.["embed"];

      if (embedId) {
        const target = media.rels.find((c) => c.Id === embedId)?.Target;
        if (target) {
          let width = "100%", height = "100%";
          const extent = findDeep(drawing, "extent");
          if (extent) {
            if (extent.cx) width = emuToPt(extent.cx) + "pt";
            if (extent.cy) height = emuToPt(extent.cy) + "pt";
          }

          const path = "word/" + target;
          try {
            const base64 = media.zip.extractBase64(path);
            const mime = media.types.find((c) => c.PartName === "/" + path)?.ContentType || "image/png";
            html += `<img src="data:${mime};base64,${base64}" style="width:${width};height:${height}" />`;
          } catch (e) {
            console.error("Failed to extract image", path, e);
          }
        }
      }
    }

    const rText = getText(getChildByTag(r, "t"));
    const rProperties = getChildByTag(r, "rPr");

    let rStyle = "";

    const bold = getChildByTag(rProperties, "b");
    const italic = getChildByTag(rProperties, "i");
    const under = getChildByTag(rProperties, "u");
    const strike = getChildByTag(rProperties, "strike");

    const format = {
      bold: bold && bold["w:val"] !== "false" && bold["val"] !== "false",
      italic: italic && italic["w:val"] !== "false" && italic["val"] !== "false",
      under: under && under["w:val"] !== "false" && under["val"] !== "false",
      strike: strike && strike["w:val"] !== "false" && strike["val"] !== "false"
    };

    const colorVal = getChildByTag(rProperties, "color")?.["w:val"] || getChildByTag(rProperties, "color")?.["val"];
    if (colorVal) rStyle += `color:#${colorVal};`;
    
    const shdVal = getChildByTag(rProperties, "shd")?.["w:fill"] || getChildByTag(rProperties, "shd")?.["fill"];
    if (shdVal) rStyle += `background:#${shdVal};`;

    const szVal = getChildByTag(rProperties, "sz")?.["w:val"] || getChildByTag(rProperties, "sz")?.["val"];
    if (szVal) rStyle += `font-size:${Number(szVal) / 2}pt;`;

    const fontVal = getChildByTag(rProperties, "rFonts")?.["w:ascii"] || getChildByTag(rProperties, "rFonts")?.["ascii"];
    if (fontVal) rStyle += `font-family:'${fontVal}';`;

    if (format.bold) pText += "<b>";
    if (format.italic) pText += "<i>";
    if (format.under) pText += "<u>";
    if (format.strike) pText += "<s>";

    if (rStyle) {
      pText += `<span style="${rStyle}">${rText}</span>`;
    } else {
      pText += rText;
    }

    if (format.bold) pText += "</b>";
    if (format.italic) pText += "</i>";
    if (format.under) pText += "</u>";
    if (format.strike) pText += "</s>";
  }

  html += `<${pTag}${pStyle ? ` style="${pStyle}"` : ""}>${pText}</${pTag}>`;
  return { html, listLevel };
};

const processTable = async (table, media, listLevel) => {

  let html = "<table style='width:100%;border-collapse:collapse'>";

  const rows = table._children.filter(c => c._tag === "w:tr" || (c._tag && c._tag.endsWith(":tr")));
  for (const row of rows) {
    html += "<tr>";

    const columns = row._children.filter(c => c._tag === "w:tc" || (c._tag && c._tag.endsWith(":tc")));
    for (const column of columns) {
      html += "<td style='border:1px solid black'>";

      const paragraphs = getChildrenByTag(column, "p");
      for (const paragraph of paragraphs) {
        const pOutput = await processParagraph(paragraph, media, listLevel);
        html += pOutput.html;
        listLevel = pOutput.listLevel;
      }

      html += "</td>";
    }

    html += "</tr>";
  }

  html += "</table>";
  return { html, listLevel };

}

const parseDOCX = async (bytes) => {

  const zip = new ZIPExtractor(bytes);

  const documentXML = zip.extractText("word/document.xml");
  const relationshipsXML = zip.extractText("word/_rels/document.xml.rels");
  const contentTypesXML = zip.extractText("[Content_Types].xml");

  const doc = parseXML(documentXML);
  const media = {
    rels: parseXML(relationshipsXML)[0]._children,
    types: parseXML(contentTypesXML)[0]._children.filter(c => c._tag === "Override"),
    zip
  };

  let listLevel = -1;
  let outputHTML = "";

  const elements = doc[0]._children[0]._children;
  for (const element of elements) {
    const tagName = element._tag || "";

    if (tagName === "w:tbl" || tagName.endsWith(":tbl")) {
      const output = await processTable(element, media, listLevel);
      outputHTML += output.html;
      listLevel = output.listLevel;
    } else if (tagName === "w:p" || tagName.endsWith(":p")) {
      const output = await processParagraph(element, media, listLevel);
      outputHTML += output.html;
      listLevel = output.listLevel;
    }
  }

  return outputHTML;

};

export default parseDOCX;

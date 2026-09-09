export default function getSubjectTheme(subjectName = "", chapterNo = "1") {
  const name = String(subjectName).toLowerCase().trim();
  const num = parseInt(chapterNo, 10) || 1;

  if (name.includes("math")) {
    return {
      subBg: "#e0f2fe",
      subColor: "#0369a1",
      subBorder: "#bae6fd",
      chapBg: "#0284c7",
      chapColor: "#ffffff",
    };
  }
  if (name.includes("sci") || name.includes("bio")) {
    return {
      subBg: "#dcfce7",
      subColor: "#15803d",
      subBorder: "#bbf7d0",
      chapBg: "#16a34a",
      chapColor: "#ffffff",
    };
  }
  if (name.includes("phy")) {
    return {
      subBg: "#f3e8ff",
      subColor: "#6b21a8",
      subBorder: "#e9d5ff",
      chapBg: "#7e22ce",
      chapColor: "#ffffff",
    };
  }
  if (name.includes("chem")) {
    return {
      subBg: "#fef3c7",
      subColor: "#b45309",
      subBorder: "#fde68a",
      chapBg: "#d97706",
      chapColor: "#ffffff",
    };
  }
  if (name.includes("eng") || name.includes("lit")) {
    return {
      subBg: "#ffe4e6",
      subColor: "#be123c",
      subBorder: "#fecdd3",
      chapBg: "#e11d48",
      chapColor: "#ffffff",
    };
  }
  if (name.includes("sans") || name.includes("hindi")) {
    return {
      subBg: "#ffedd5",
      subColor: "#c2410c",
      subBorder: "#fed7aa",
      chapBg: "#ea580c",
      chapColor: "#ffffff",
    };
  }
  if (
    name.includes("soc") ||
    name.includes("his") ||
    name.includes("geo") ||
    name.includes("civ")
  ) {
    return {
      subBg: "#ccfbf1",
      subColor: "#0f766e",
      subBorder: "#99f6e4",
      chapBg: "#0d9488",
      chapColor: "#ffffff",
    };
  }

  const palettes = [
    {
      subBg: "#eff6ff",
      subColor: "#1d4ed8",
      subBorder: "#bfdbfe",
      chapBg: "#2563eb",
      chapColor: "#ffffff",
    },
    {
      subBg: "#f5f3ff",
      subColor: "#5b21b6",
      subBorder: "#ddd6fe",
      chapBg: "#6d28d9",
      chapColor: "#ffffff",
    },
    {
      subBg: "#f0fdf4",
      subColor: "#166534",
      subBorder: "#bbf7d0",
      chapBg: "#15803d",
      chapColor: "#ffffff",
    },
    {
      subBg: "#fff7ed",
      subColor: "#9a3412",
      subBorder: "#ffedd5",
      chapBg: "#c2410c",
      chapColor: "#ffffff",
    },
    {
      subBg: "#fdf2f8",
      subColor: "#9d174d",
      subBorder: "#fbcfe8",
      chapBg: "#be185d",
      chapColor: "#ffffff",
    },
    {
      subBg: "#ecfdf5",
      subColor: "#047857",
      subBorder: "#a7f3d0",
      chapBg: "#059669",
      chapColor: "#ffffff",
    },
  ];

  const charCodeSum =
    name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) + num;
  return palettes[charCodeSum % palettes.length];
}

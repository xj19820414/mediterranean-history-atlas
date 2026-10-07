(() => {
  let lang = localStorage.getItem("atlas-lang") || "zh";
  const dict = () => window.ATLAS_I18N[lang];
  const $ = (id) => document.getElementById(id);
  const apply = () => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = dict()[node.dataset.i18n] || node.textContent; });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => { node.placeholder = dict()[node.dataset.i18nPlaceholder] || node.placeholder; });
    $("languageToggle").textContent = dict().toggle;
    $("boundarySearch").placeholder = dict().searchPlaceholder;
    document.title = dict().title;
    window.AtlasLanguage = lang;
    document.body.dataset.language = lang;
    window.dispatchEvent(new CustomEvent("atlas-language-change",{detail:{lang}}));
  };
  window.AtlasI18n = { get lang(){return lang;}, t(key){return dict()[key] || key;}, toggle(){lang = lang === "zh" ? "en" : "zh"; localStorage.setItem("atlas-lang",lang); apply();} };
  document.addEventListener("DOMContentLoaded", () => { $("languageToggle").addEventListener("click", () => window.AtlasI18n.toggle()); apply(); });
})();

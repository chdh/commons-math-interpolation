const outputFormat = process.env["typeDoc_outputFormat"] ?? "md";

switch (outputFormat) {

   case "md":
   case "wiki": {

      const plugin = [
         "typedoc-plugin-markdown",
         "typedoc-plugin-rename-defaults"
      ];
      if (outputFormat == "wiki") {
         plugin.push("typedoc-github-wiki-theme");
      }
      module.exports = {
         plugin,

         // Plugin MarkDown options:
         useCodeBlocks: true,
         indexFormat: "table",
//       parametersFormat: "table",
//       interfacePropertiesFormat: "table",
         classPropertiesFormat: "table",
         typeAliasPropertiesFormat: "table",
         enumMembersFormat: "table",
         propertyMembersFormat: "table",
         typeDeclarationFormat: "table",
//       router: "module",

         // TypeDoc options:
         readme: "none",
         excludeExternals: true,
         hideGenerator: true,
         out: (outputFormat == "wiki") ? "wiki" : "apiDoc",
         cleanOutputDir: (outputFormat == "wiki") ? false : true,
//       disableGit: true,
//       disableSources: true,

      };
      break;
   }

   case "html": {
      module.exports = {
         plugin: ["typedoc-plugin-rename-defaults"],
         excludeExternals: true,
         hideGenerator: true,
         router: "structure",
         out: "apiDoc",
         customCss: "./typeDoc.css",
      // readme: "none",
      };
      break;
   }
}

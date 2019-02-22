import replace from "rollup-plugin-replace";

const {version, name} = require("./package.json");
export default {
  input: "./sw.src.js",
  output: {
    file: "./sw.js",
    format: "esm"
  },
  plugins: [
    replace({
      delimiters: ["{{", "}}"],
      version,
      name
    })
  ]
}
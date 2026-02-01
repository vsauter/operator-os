"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/shebang-command@2.0.0";
exports.ids = ["vendor-chunks/shebang-command@2.0.0"];
exports.modules = {

/***/ "(rsc)/../../node_modules/.pnpm/shebang-command@2.0.0/node_modules/shebang-command/index.js":
/*!********************************************************************************************!*\
  !*** ../../node_modules/.pnpm/shebang-command@2.0.0/node_modules/shebang-command/index.js ***!
  \********************************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("\nconst shebangRegex = __webpack_require__(/*! shebang-regex */ \"(rsc)/../../node_modules/.pnpm/shebang-regex@3.0.0/node_modules/shebang-regex/index.js\");\n\nmodule.exports = (string = '') => {\n\tconst match = string.match(shebangRegex);\n\n\tif (!match) {\n\t\treturn null;\n\t}\n\n\tconst [path, argument] = match[0].replace(/#! ?/, '').split(' ');\n\tconst binary = path.split('/').pop();\n\n\tif (binary === 'env') {\n\t\treturn argument;\n\t}\n\n\treturn argument ? `${binary} ${argument}` : binary;\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3NoZWJhbmctY29tbWFuZEAyLjAuMC9ub2RlX21vZHVsZXMvc2hlYmFuZy1jb21tYW5kL2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFhO0FBQ2IscUJBQXFCLG1CQUFPLENBQUMsNkdBQWU7O0FBRTVDO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBLHNCQUFzQixRQUFRLEVBQUUsU0FBUztBQUN6QyIsInNvdXJjZXMiOlsid2VicGFjazovL0BvcGVyYXRvci91aS8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vc2hlYmFuZy1jb21tYW5kQDIuMC4wL25vZGVfbW9kdWxlcy9zaGViYW5nLWNvbW1hbmQvaW5kZXguanM/OGY2ZCJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5jb25zdCBzaGViYW5nUmVnZXggPSByZXF1aXJlKCdzaGViYW5nLXJlZ2V4Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gKHN0cmluZyA9ICcnKSA9PiB7XG5cdGNvbnN0IG1hdGNoID0gc3RyaW5nLm1hdGNoKHNoZWJhbmdSZWdleCk7XG5cblx0aWYgKCFtYXRjaCkge1xuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cblx0Y29uc3QgW3BhdGgsIGFyZ3VtZW50XSA9IG1hdGNoWzBdLnJlcGxhY2UoLyMhID8vLCAnJykuc3BsaXQoJyAnKTtcblx0Y29uc3QgYmluYXJ5ID0gcGF0aC5zcGxpdCgnLycpLnBvcCgpO1xuXG5cdGlmIChiaW5hcnkgPT09ICdlbnYnKSB7XG5cdFx0cmV0dXJuIGFyZ3VtZW50O1xuXHR9XG5cblx0cmV0dXJuIGFyZ3VtZW50ID8gYCR7YmluYXJ5fSAke2FyZ3VtZW50fWAgOiBiaW5hcnk7XG59O1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/../../node_modules/.pnpm/shebang-command@2.0.0/node_modules/shebang-command/index.js\n");

/***/ })

};
;
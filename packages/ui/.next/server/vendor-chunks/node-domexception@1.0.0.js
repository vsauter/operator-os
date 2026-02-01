/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/node-domexception@1.0.0";
exports.ids = ["vendor-chunks/node-domexception@1.0.0"];
exports.modules = {

/***/ "(rsc)/../../node_modules/.pnpm/node-domexception@1.0.0/node_modules/node-domexception/index.js":
/*!************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/node-domexception@1.0.0/node_modules/node-domexception/index.js ***!
  \************************************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("/*! node-domexception. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */\n\nif (!globalThis.DOMException) {\n  try {\n    const { MessageChannel } = __webpack_require__(/*! worker_threads */ \"worker_threads\"),\n    port = new MessageChannel().port1,\n    ab = new ArrayBuffer()\n    port.postMessage(ab, [ab, ab])\n  } catch (err) {\n    err.constructor.name === 'DOMException' && (\n      globalThis.DOMException = err.constructor\n    )\n  }\n}\n\nmodule.exports = globalThis.DOMException\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL25vZGUtZG9tZXhjZXB0aW9uQDEuMC4wL25vZGVfbW9kdWxlcy9ub2RlLWRvbWV4Y2VwdGlvbi9pbmRleC5qcyIsIm1hcHBpbmdzIjoiQUFBQTs7QUFFQTtBQUNBO0FBQ0EsWUFBWSxpQkFBaUIsRUFBRSxtQkFBTyxDQUFDLHNDQUFnQjtBQUN2RDtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSIsInNvdXJjZXMiOlsid2VicGFjazovL0BvcGVyYXRvci91aS8uLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vbm9kZS1kb21leGNlcHRpb25AMS4wLjAvbm9kZV9tb2R1bGVzL25vZGUtZG9tZXhjZXB0aW9uL2luZGV4LmpzP2VlM2UiXSwic291cmNlc0NvbnRlbnQiOlsiLyohIG5vZGUtZG9tZXhjZXB0aW9uLiBNSVQgTGljZW5zZS4gSmltbXkgV8OkcnRpbmcgPGh0dHBzOi8vamltbXkud2FydGluZy5zZS9vcGVuc291cmNlPiAqL1xuXG5pZiAoIWdsb2JhbFRoaXMuRE9NRXhjZXB0aW9uKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBNZXNzYWdlQ2hhbm5lbCB9ID0gcmVxdWlyZSgnd29ya2VyX3RocmVhZHMnKSxcbiAgICBwb3J0ID0gbmV3IE1lc3NhZ2VDaGFubmVsKCkucG9ydDEsXG4gICAgYWIgPSBuZXcgQXJyYXlCdWZmZXIoKVxuICAgIHBvcnQucG9zdE1lc3NhZ2UoYWIsIFthYiwgYWJdKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBlcnIuY29uc3RydWN0b3IubmFtZSA9PT0gJ0RPTUV4Y2VwdGlvbicgJiYgKFxuICAgICAgZ2xvYmFsVGhpcy5ET01FeGNlcHRpb24gPSBlcnIuY29uc3RydWN0b3JcbiAgICApXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnbG9iYWxUaGlzLkRPTUV4Y2VwdGlvblxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/../../node_modules/.pnpm/node-domexception@1.0.0/node_modules/node-domexception/index.js\n");

/***/ })

};
;
const Backoffice = require("express").Router();
const {
  createAdmin,
  AuthAdmin,
  createCategory,
  createSubCategory,
} = require("../controllers/Backoffice.controller");
const { isAdmin } = require("../middlewares/backoffice/isAdmin");
const use = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

Backoffice.post("/AuthAdmin", use(AuthAdmin));
Backoffice.post("/createAdmin", use(isAdmin), use(createAdmin));

Backoffice.post("/createCategory", use(isAdmin), use(createCategory));
Backoffice.post("/createSubCategory", use(isAdmin), use(createSubCategory));

module.exports = Backoffice;

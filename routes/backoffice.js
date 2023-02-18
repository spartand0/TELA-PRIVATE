const Backoffice = require("express").Router();
const {
  createAdmin,
  AuthAdmin,
  createCategory,
  createSubCategory,
  getCategories,
  getSubCategories,
  getCategory,
  getSubCategory,
  editCategory,
  editSubCategory,
  archiveCategory,
  archiveSubCategory,
} = require("../controllers/Backoffice.controller");
const { isAdmin } = require("../middlewares/backoffice/isAdmin");
const use = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

Backoffice.post("/AuthAdmin", use(AuthAdmin));
Backoffice.post("/createAdmin", use(createAdmin));

Backoffice.post("/createCategory", use(isAdmin), use(createCategory));
Backoffice.post("/createSubCategory", use(isAdmin), use(createSubCategory));

Backoffice.get("/getCategories", use(isAdmin), use(getCategories));
Backoffice.get("/getSubCategories", use(isAdmin), use(getSubCategories));

Backoffice.get("/getCategory/:id", use(isAdmin), use(getCategory));
Backoffice.get("/getSubCategory/:id", use(isAdmin), use(getSubCategory));

Backoffice.put("/editCategory/:id", use(isAdmin), use(editCategory));
Backoffice.put("/editSubCategory/:id", use(isAdmin), use(editSubCategory));

Backoffice.put("/archiveCategory/:id", use(isAdmin), use(archiveCategory));
Backoffice.put(
  "/archiveSubCategory/:id",
  use(isAdmin),
  use(archiveSubCategory)
);

module.exports = Backoffice;

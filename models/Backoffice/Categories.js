const mongoose = require("mongoose");
const { Schema } = mongoose;
const subCategory = new Schema({
  idSubCat: { type: String, require: true },
  subCatName: { type: String, require: true },
  creationDate: { type: String, default: new Date() },
  createdBy: {
    idAdmin: { type: String },
    email: { type: String },
  },
  isArchived: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  image: { type: String,default:'' }
});
const Category = new Schema({
  idCategory: { type: String, require: true },
  categoryName: { type: String, require: true },
  subCategories: { type: [subCategory], default: [] },
  creationDate: { type: String, default: new Date() },
  createdBy: {
    idAdmin: { type: String },
    email: { type: String },
  },
  isArchived: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  image: { type: String ,default:''},
});

const CategoryModel = mongoose.model("Category", Category);
module.exports = CategoryModel;

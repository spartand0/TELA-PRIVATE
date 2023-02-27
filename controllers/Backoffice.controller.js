const CategoryModel = require("../models/Backoffice/Categories");
const AdminModel = require("../models/Backoffice/Admin");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// .----------------.   .----------------.   .----------------.  .----------------.  .----------------.  .----------------.  .----------------.  .----------------.
// | .--------------. | | .--------------. | | .--------------. || .--------------. || .--------------. || .--------------. || .--------------. || .--------------. |
// | |   ______     | | | |              | | | |     ____     | || |  _________   | || |  _________   | || |     _____    | || |     ______   | || |  _________   | |
// | |  |_   _ \    | | | |              | | | |   .'    `.   | || | |_   ___  |  | || | |_   ___  |  | || |    |_   _|   | || |   .' ___  |  | || | |_   ___  |  | |
// | |    | |_) |   | | | |    ______    | | | |  /  .--.  \  | || |   | |_  \_|  | || |   | |_  \_|  | || |      | |     | || |  / .'   \_|  | || |   | |_  \_|  | |
// | |    |  __'.   | | | |   |______|   | | | |  | |    | |  | || |   |  _|      | || |   |  _|      | || |      | |     | || |  | |         | || |   |  _|  _   | |
// | |   _| |__) |  | | | |              | | | |  \  `--'  /  | || |  _| |_       | || |  _| |_       | || |     _| |_    | || |  \ `.___.'\  | || |  _| |___/ |  | |
// | |  |_______/   | | | |              | | | |   `.____.'   | || | |_____|      | || | |_____|      | || |    |_____|   | || |   `._____.'  | || | |_________|  | |
// | |              | | | |              | | | |              | || |              | || |              | || |              | || |              | || |              | |
// | '--------------' | | '--------------' | | '--------------' || '--------------' || '--------------' || '--------------' || '--------------' || '--------------' |
//  '----------------'   '----------------'   '----------------'  '----------------'  '----------------'  '----------------'  '----------------'  '----------------'

exports.AuthAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).send({
        message: "Please provide a valid user !",
        code: 400,
        requestDate: Date.now(),
        success: false,
      });
    }
    const foundAdmin = await AdminModel.findOne({ Email: email });
    if (!foundAdmin) {
      return res.status(404).send({
        message: "This user dosent exist in the database , please verify and send again",
        code: 404,
        requestDate: Date.now(),
        success: false,
      });
    }
    bcrypt.compare(password, foundAdmin.authPassword, async (err, data) => {
      //if error than throw error
      if (err) throw err;

      //if both match than you can do anything
      if (data) {
        foundAdmin.loginHistory.push({
          date: Date.now(),
          device: req.headers["user-agent"],
          ip: req.ip,
          success: true,
        });
        const token = jwt.sign(
          { id: foundAdmin.id, email, role: foundAdmin.role },
          process.env.SECRET_KEY,
          {
            expiresIn: "30d",
          }
        );
        foundAdmin.save();
        res.cookie("x-tela-token", token);
        return res.status(200).json({
          message: "Login success",
          code: 200,
          success: true,
          date: Date.now(),
        });
      } else {
        foundAdmin.loginHistory.push({
          date: Date.now(),
          device: req.headers["user-agent"],
          ip: req.ip,
          success: false,
        });
        await foundAdmin.save();
        return res.status(401).json({ message: "Invalid credential", code: 401, success: false });
      }
    });
  } catch (err) {
    res.status(500).send({
      message: "This error is coming from login endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { userFullName, email, password } = req.body;
    if (!userFullName || !password || !email) {
      return res.status(400).send({
        message: "Missing informations , please verify and try again",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    const foundAdmin = await AdminModel.findOne({
      Email: email,
    });
    if (foundAdmin) {
      return res.status(400).send({
        message:
          "The user already exist , please another email or phone number",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    const authPassword = await bcrypt.hash(password, 10);
    const Admin = new AdminModel({
      id: uuidv4(),
      userFullName: userFullName,
      Email: email,
      authPassword: authPassword,
    });


    const token = jwt.sign(
      { id: Admin.id, 
        email, 
        role: Admin.role, 
      },
      process.env.SECRET_KEY,
      {
        expiresIn: "30d",
      }
    );

    await Admin.save();
    res.cookie("x-tela-token", token);
    return res.status(200).send({
      message: "User created successfuly",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (err) {
    res.status(500).send({
      message:
        "This error is coming from createAdmin endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

/************************************************                 CATEGORIES CRUD                     *****************************************************************************************/

exports.createCategory = async (req, res) => {
  try {
    const { categoryName, description, image } = req.body;
    if (!categoryName) {
      return res.status(400).send({
        message: "Missing category name , please verify and try again",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    const foundCategory = await CategoryModel.findOne({
      categoryName,
    });
    if (foundCategory) {
      return res.status(400).send({
        message: "The Category already exist , please add another category",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    const admin = jwt.verify(req["cookies"]["x-tela-token"], process.env.SECRET_KEY);
    const Category = new CategoryModel({
      idCategory: uuidv4(),
      categoryName,
      description,
      image,
      createdBy: {
        idAdmin: admin.id,
        email: admin.email,
      },
    });
    await Category.save();
    return res.status(200).send({
      message: "Category created successfuly",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (err) {
    res.status(500).send({
      message:
        "This error is coming from createCategory endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};
exports.createSubCategory = async (req, res) => {
  try {
    const { idCategory, subCategory, description, image } = req.body;
    if (!idCategory || !subCategory) {
      return res.status(400).send({
        message: "Missing category id & subCategory infos , please verify and try again",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    const foundCategory = await CategoryModel.findOne({
      idCategory,
    });
    if (!foundCategory) {
      return res.status(400).send({
        message: "Cannot find category , please verify and try again",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    const admin = jwt.verify(req["cookies"]["x-tela-token"], process.env.SECRET_KEY);
    foundCategory.subCategories.push({
      idSubCat: uuidv4(),
      subCatName: subCategory,
      description, 
      image,
      createdBy: {
        idAdmin: admin.id,
        email: admin.email,
      },
    });
    await foundCategory.save();
    return res.status(200).send({
      message: "Sub Category created successfuly",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (err) {
    res.status(500).send({
      message:
        "This error is coming from createSubCategory endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const foundCategories = await CategoryModel.find();
    return res.status(200).send({
      message: "Fetched all categories",
      code: 200,
      success: true,
      date: Date.now(),
      categories: foundCategories,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getCategories endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getSubCategories = async (req, res) => {
  try {
    const foundCategories = await CategoryModel.find();
    let subCategories = [];
    foundCategories.map((catg) => {
      subCategories.push(catg.subCategories);
    });

    return res.status(200).send({
      message: "Fetched all sub categories",
      code: 200,
      success: true,
      date: Date.now(),
      subCategories,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getSubCategories endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const idCategory = req.params["id"];
    const foundCategory = await CategoryModel.findOne({ idCategory });
    if (!foundCategory) {
      return res.status(404).send({
        message: "Category not found",
        code: 404,
        success: false,
        date: Date.now(),
        categories: foundCategory,
      });
    }
    return res.status(200).send({
      message: "Fetched category",
      code: 200,
      success: true,
      date: Date.now(),
      category: foundCategory,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getCategory endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getSubCategory = async (req, res) => {
  try {
    const idCategory = req.params["id"];
    const { idSubCat } = req.body;
    const foundCategory = await CategoryModel.findOne({ idCategory });
    let foundSubCategory;
    foundCategory.subCategories.map((catg) => {
      if (catg.idSubCat === idSubCat) {
        foundSubCategory = catg;
        return;
      }
    });

    return res.status(200).send({
      message: "Fetched sub category",
      code: 200,
      success: true,
      date: Date.now(),
      subCategory: foundSubCategory,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getSubCategory endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.editCategory = async (req, res) => {
  try {
    const idCategory = req.params["id"];
    const { categoryName, image, isActive } = req.body;
    const foundCategory = await CategoryModel.findOne({ idCategory });
    foundCategory.categoryName = categoryName || foundCategory.categoryName;
    foundCategory.image = image || foundCategory.image;
    foundCategory.isActive = isActive || foundCategory.isActive;
    await foundCategory.save();
    res.status(200).send({
      code: 200,
      message: "Updated category",
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from editCategory endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.editSubCategory = async (req, res) => {
  try {
    const idCategory = req.params["id"];
    const { idSubCat, subCatName, image, isActive } = req.body;
    const foundCategory = await CategoryModel.findOne({ idCategory });
    foundCategory.subCategories.map((catg) => {
      if (catg.idSubCat === idSubCat) {
        catg.subCatName = subCatName;
        catg.image = image;
        catg.isActive = isActive;
        return;
      }
    });
    await foundCategory.save();
    res.status(200).send({
      code: 200,
      message: "Updated sub category",
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from editSubCategory endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.archiveCategory = async (req, res) => {
  try {
    const idCategory = req.params["id"];
    const foundCategory = await CategoryModel.findOne({ idCategory });
    foundCategory.isArchived = !foundCategory.isArchived;
    await foundCategory.save();
    res.status(200).send({
      code: 200,
      message: "Archived category",
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from archiveCategory endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.archiveSubCategory = async (req, res) => {
  try {
    const idCategory = req.params["id"];
    const { idSubCat } = req.body;
    const foundCategory = await CategoryModel.findOne({ idCategory });
    foundCategory.subCategories.map((catg) => {
      if (catg.idSubCat === idSubCat) {
        catg.isArchived = !catg.isArchived;
        return;
      }
    });
    await foundCategory.save();
    res.status(200).send({
      code: 200,
      message: "Archived sub category",
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from archiveSubCategory endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

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
        message:
          "This user dosent exist in the database , please verify and send again",
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
        return res
          .status(401)
          .json({ message: "Invalid credential", code: 401, success: false });
      }
    });
  } catch (err) {
    res.status(500).send({
      message:
        "This error is coming from login endpoint, please report to the sys administrator !",
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
    await Admin.save();
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
    const { categoryName } = req.body;
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
    const admin = jwt.verify(
      req["cookies"]["x-tela-token"],
      process.env.SECRET_KEY
    );
    const Category = new CategoryModel({
      idCategory: uuidv4(),
      categoryName,
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
    const { idCategory, subCategory } = req.body;
    if (!idCategory || !subCategory) {
      return res.status(400).send({
        message:
          "Missing category id & subCategory infos , please verify and try again",
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
        message: "cannot find category , please verify and try again",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    const admin = jwt.verify(
      req["cookies"]["x-tela-token"],
      process.env.SECRET_KEY
    );
    foundCategory.subCategories.push({
      idSubCat: uuidv4(),
      subCatName: subCategory,
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

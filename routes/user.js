const User = require("express").Router();
const {
  createUser,
  AuthUser,
  getRequests,
  createRequest,
  getRequest,
  confirmProvider,
  viewProfile,
  searchProviders,
  approveTransaction,
  sendOtp,
  verifyOtp,
  sendEmailConfirmation,
  confirmEmail,
  editProfile,
  completeTransaction,
  rateProvider,
  markAsFavorite,
  editProvider,
  declineProvider,
  getFavProviders,
  changePassword,
  ResetPassword,
  confirmResetPassword,
  getCategory,
  getCategories,
  getSubCategory,
  getSubCategories,
} = require("../controllers/User.controller");
const { isUser } = require("../middlewares/User/isUser");
const { isProvider } = require("../middlewares/User/isProvider");

const use = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// AUTH
User.post("/login", use(AuthUser));
User.post("/createUser", use(createUser));
User.post("/changePassword", use(isUser), use(changePassword));

//Missing API's for SMSing and Emailing
User.post("/sendOtp", use(isUser), use(sendOtp));
User.post("/verifyOtp", use(isUser), use(verifyOtp));
User.post("/sendEmailConfirmation", use(isUser), use(sendEmailConfirmation));
User.post("/confirmEmail", use(isUser), use(confirmEmail));
User.post("/resetpassword", use(ResetPassword));
User.post("/confirmResetPassword", use(confirmResetPassword));

// POST
User.post(
  "/createRequest",
  use(isUser),
  use(createRequest),
  use(searchProviders)
);
User.post("/markAsFavorite/:id", use(isUser), use(markAsFavorite));
User.post("/rateProvider/:id", use(isUser), use(rateProvider));
// GET
User.get("/getCategory", use(isUser), use(getCategory));
User.get("/getCategories", use(isUser), use(getCategories));
User.get("/getSubCategory", use(isUser), use(getSubCategory));
User.get("/getSubCategories", use(isUser), use(getSubCategories));
User.get("/getRequest/:id", use(isUser), use(getRequest));
User.get("/getRequests", use(isUser), use(getRequests));
User.get("/viewProfile", use(isUser), use(viewProfile));
User.get("/getFavProviders", use(isUser), use(getFavProviders));
//PUT
User.put("/editProfile/:id", use(isUser), use(editProfile));
User.put("/editProvider/:id", use(isUser), use(editProvider));
User.put("/approveTransaction/:id", use(isProvider), use(approveTransaction));
User.put("/confirmProvider/:id", use(isUser), use(confirmProvider));
User.put("/declineProvider/:id", use(isUser), use(declineProvider));
User.put("/completeTransaction/:id", use(isProvider), use(completeTransaction));
module.exports = User;

// .----------------.  .----------------.  .----------------.  .----------------.
// | .--------------. || .--------------. || .--------------. || .--------------. |
// | |  _________   | || |  _________   | || |   _____      | || |      __      | |
// | | |  _   _  |  | || | |_   ___  |  | || |  |_   _|     | || |     /  \     | |
// | | |_/ | | \_|  | || |   | |_  \_|  | || |    | |       | || |    / /\ \    | |
// | |     | |      | || |   |  _|  _   | || |    | |   _   | || |   / ____ \   | |
// | |    _| |_     | || |  _| |___/ |  | || |   _| |__/ |  | || | _/ /    \ \_ | |
// | |   |_____|    | || | |_________|  | || |  |________|  | || ||____|  |____|| |
// | |              | || |              | || |              | || |              | |
// | '--------------' || '--------------' || '--------------' || '--------------' |
//  '----------------'  '----------------'  '----------------'  '----------------'

const express = require("express");
const connectDB = require("./config/connectDB");
const morgan = require("morgan");
const User = require("./routes/user");
const backoffice = require("./routes/backoffice");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const {
  ValidationError,
  NotFoundError,
  DBError,
  ConstraintViolationError,
  UniqueViolationError,
  NotNullViolationError,
  ForeignKeyViolationError,
  CheckViolationError,
  DataError,
} = require("objection");

//environement
require("dotenv").config({ path: "./config/.env" });

//app
const app = express();

app.use(morgan("dev"));
app.use(cors());
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
  })
);
app.use(cookieParser()); //routes
app.use(express.json({ limit: "50mb" }));

// app.use("/api/session", Session);
app.use("/api/user", User, function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
});
app.use("/api/backoffice", backoffice, function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
});
app.use(async function (err, req, res, next) {
  augmentObjectionError(err);
  const { message, status = null } = err;
  res.status(Number(err.status) || 500).json({
    code: status,
    description: message,
  });
});

function augmentObjectionError(err, res) {
  if (err instanceof ValidationError) {
    err.status = 400;
  } else if (err instanceof NotFoundError) {
    err.status = 404;
  } else if (err instanceof UniqueViolationError) {
    err.status = 409;
  } else if (err instanceof NotNullViolationError) {
    err.status = 400;
  } else if (err instanceof ForeignKeyViolationError) {
    err.status = 409;
  } else if (err instanceof CheckViolationError) {
    err.status = 400;
  } else if (err instanceof ConstraintViolationError) {
    err.status = 409;
  } else if (err instanceof DataError) {
    err.status = 400;
  } else if (err instanceof DBError) {
    err.status = 500;
  } else {
    err.status = 500;
  }
}

//db Connect
connectDB();
mongoose.Promise = global.Promise;

//middlewares

//port
port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});

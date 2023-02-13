const mongoose = require("mongoose");
const { Schema } = mongoose;


const Admin = new Schema({
  id: { type: String, require: true },
  userFullName: { type: String, default: "unknown" },
  role:{type:String,default:'Admin'},
  loginHistory:{type:Array,default:[]},
  Email: { type: String, default: "" },
  authPassword:{type:String,required:true},
  Otp: { type: String, Default: "" }, 
  creationDate: { type: Date, default: Date.now() },
  Selfie: { type: String },
  Status: { type: String, default: "Pending" }
});

const AdminModel = mongoose.model("Admin", Admin);
module.exports = AdminModel;

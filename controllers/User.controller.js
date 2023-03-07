const UserModel = require("../models/User/User");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const CategoryModel = require("../models/Backoffice/Categories");
const TransactionModel = require("../models/Transaction/Transaction");
const haversine = require("haversine");

// .----------------.  .----------------.  .----------------.  .----------------.
// | .--------------. || .--------------. || .--------------. || .--------------. |
// | |      __      | || | _____  _____ | || |  _________   | || |  ____  ____  | |
// | |     /  \     | || ||_   _||_   _|| || | |  _   _  |  | || | |_   ||   _| | |
// | |    / /\ \    | || |  | |    | |  | || | |_/ | | \_|  | || |   | |__| |   | |
// | |   / ____ \   | || |  | '    ' |  | || |     | |      | || |   |  __  |   | |
// | | _/ /    \ \_ | || |   \ `--' /   | || |    _| |_     | || |  _| |  | |_  | |
// | ||____|  |____|| || |    `.__.'    | || |   |_____|    | || | |____||____| | |
// | |              | || |              | || |              | || |              | |
// | '--------------' || '--------------' || '--------------' || '--------------' |
//  '----------------'  '----------------'  '----------------'  '----------------'

exports.createUser = async (req, res) => {
  try {
    const { userFullName, email, password, phoneNumber } = req.body;
    if (!userFullName || !password || !email) {
      return res.status(400).send({
        message: "Missing informations , please verify and try again",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    const foundUser = await UserModel.find({
      $or: [
        { "userEmail.Email": email },
        { "userPhoneNumber.Number": phoneNumber },
      ],
    });
    if (foundUser[0]) {
      return res.status(400).send({
        message:
          "The user already exist , please use another email or phone number",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    const authPassword = await bcrypt.hash(password, 10);
    const user = new UserModel({
      id: uuidv4(),
      userFullName: userFullName,
      "userEmail.Email": email || "",
      "userPhoneNumber.Number": phoneNumber || "",
      authPassword: authPassword,
    });
    const token = jwt.sign(
      {
        id: user.id,
        email,
        role: user.role,
        provider: user.isProvider,
      },
      process.env.SECRET_KEY,
      {
        expiresIn: "30d",
      }
    );
    await user.save();
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
        "This error is coming from createUser endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.AuthUser = async (req, res) => {
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
    const foundUser = await UserModel.findOne({ "userEmail.Email": email });
    if (!foundUser) {
      return res.status(404).send({
        message:
          "This user dosent exist in the database , please verify and send again",
        code: 404,
        requestDate: Date.now(),
        success: false,
      });
    }
    bcrypt.compare(password, foundUser.authPassword, async (err, data) => {
      //if error than throw error
      if (err) throw err;

      //if both match than you can do anything
      if (data) {
        foundUser.loginHistory.push({
          date: Date.now(),
          device: req.headers["user-agent"],
          ip: req.ip,
          success: true,
        });
        const token = jwt.sign(
          {
            id: foundUser.id,
            email,
            role: foundUser.role,
            provider: foundUser.isProvider,
          },
          process.env.SECRET_KEY,
          {
            expiresIn: "30d",
          }
        );
        foundUser.save();
        res.cookie("x-tela-token", token);
        return res
          .status(200)
          .json({ message: "Login success", code: 200, success: true });
      } else {
        foundUser.loginHistory.push({
          date: Date.now(),
          device: req.headers["user-agent"],
          ip: req.ip,
          success: false,
        });
        await foundUser.save();
        return res
          .status(401)
          .json({ message: "Invalid credencial", code: 401, success: false });
      }
    });
  } catch (err) {
    res.status(500).send({
      message:
        "This error is coming from AuthUser endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { number } = req.body;
    const token = req.headers["x-hanini-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    const foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message:
          "This user dosent exist in the database , please verify and send again",
        code: 404,
        requestDate: Date.now(),
        success: false,
      });
    }
    const OTP = Math.floor(
      Math.pow(10, 4 - 1) +
        Math.random() * (Math.pow(10, 4) - Math.pow(10, 4 - 1) - 1)
    );
    foundUser.Otp = OTP;
    const attempt = {
      PhoneTried: number,
      DateTry: Date.now(),
    };
    foundUser.userPhoneNumber.tries.push(attempt);
    foundUser.save();
    const body = `Your HoozJob confirmation code: ${OTP}`;
    // send sms here
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from sendOtp endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};
exports.verifyOtp = async (req, res) => {
  try {
    const token = req["cookies"]["x-tela-token"];
    const { otp } = req.body;
    if (!otp) {
      return res.status(404).send({
        message: "OTP missing",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const user = jwt.verify(token, process.env.process.env.SECRET_KEY);
    const foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (foundUser.Otp === otp) {
      foundUser.Otp = "";
      foundUser.userPhoneNumber.isVerified = true;
      foundUser.userPhoneNumber.dateOfVerification = Date.now();
      foundUser.save();
      return res.status(200).send({
        message: "Phone number verified",
        code: 200,
        success: true,
        date: Date.now(),
      });
    } else {
      return res.status(406).send({
        message: "Invalid OTP",
        code: 406,
        success: false,
        date: Date.now(),
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from verifyOtp endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const token = req["cookies"]["x-tela-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    const foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { newPassword, currentPassword, confirmNewPassword } = req.body;
    if (newPassword === confirmNewPassword) {
      const testCurrentPass = await bcrypt.compare(
        currentPassword,
        foundUser.authPassword
      );
      if (testCurrentPass) {
        const testNewPass = await bcrypt.compare(
          newPassword,
          foundUser.authPassword
        );
        if (!testNewPass) {
          foundUser.authPassword = await bcrypt.hash(newPassword, 10);
          res.status(200).send({
            code: 200,
            message: "Password changed successfully",
            success: true,
            date: Date.now(),
          });

          const notification = {
            id: uuidv4(),
            createdAt: Date.now(),
            title: "Password Changed",
            content:
              "Your password has been changed. If this wasn't you, contact Support for a solution.",
          };
          // Add and save notification into each team member notification array
          foundUser.notifications.push(notification);
          foundUser.save();
        } else {
          res.status(406).send({
            code: 406,
            message: "Your new password cannot be your old one",
            success: false,
            date: Date.now(),
          });
        }
      } else {
        res.status(406).send({
          code: 406,
          message: "Password doesn't match your current one",
          success: false,
          date: Date.now(),
        });
      }
    } else {
      res.status(406).send({
        code: 406,
        message: "Your new passwords don't match",
        success: false,
        date: Date.now(),
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from changePassword endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

//  .----------------.  .----------------.  .----------------.  .----------------.  .----------------.  .----------------.  .----------------.
// | .--------------. || .--------------. || .--------------. || .--------------. || .--------------. || .--------------. || .--------------. |
// | |  _______     | || |  _________   | || |    ______    | || | _____  _____ | || |   _____      | || |      __      | || |  _______     | |
// | | |_   __ \    | || | |_   ___  |  | || |  .' ___  |   | || ||_   _||_   _|| || |  |_   _|     | || |     /  \     | || | |_   __ \    | |
// | |   | |__) |   | || |   | |_  \_|  | || | / .'   \_|   | || |  | |    | |  | || |    | |       | || |    / /\ \    | || |   | |__) |   | |
// | |   |  __ /    | || |   |  _|  _   | || | | |    ____  | || |  | '    ' |  | || |    | |   _   | || |   / ____ \   | || |   |  __ /    | |
// | |  _| |  \ \_  | || |  _| |___/ |  | || | \ `.___]  _| | || |   \ `--' /   | || |   _| |__/ |  | || | _/ /    \ \_ | || |  _| |  \ \_  | |
// | | |____| |___| | || | |_________|  | || |  `._____.'   | || |    `.__.'    | || |  |________|  | || ||____|  |____|| || | |____| |___| | |
// | |              | || |              | || |              | || |              | || |              | || |              | || |              | |
// | '--------------' || '--------------' || '--------------' || '--------------' || '--------------' || '--------------' || '--------------' |
//  '----------------'  '----------------'  '----------------'  '----------------'  '----------------'  '----------------'  '----------------'

exports.editProfile = async (req, res) => {
  try {
    const id = req.params["id"];
    const token = req["cookies"]["x-tela-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    let foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    } else if (foundUser.id !== id) {
      return res.status(401).send({
        message: "Unauthorized",
        code: 401,
        success: false,
        date: Date.now(),
      });
    }
    if (req.body.email) {
      console.log("here");
      let foundMail = await UserModel.findOne({
        "userPhoneNumber.Email": req.body.email,
      });
      if (foundMail && foundMail.id === foundUser.id) {
        return res.status(406).send({
          message: "Email already exists",
          code: 406,
          success: false,
          date: Date.now(),
        });
      }
    }
    const {
      userFullName,
      longitude,
      latitude,
      address,
      email,
      number,
      Selfie,
    } = req.body;

    foundUser.userFullName = userFullName || foundUser.userFullName;
    foundUser.userEmail.Email = email || foundUser.userEmail.Email;
    foundUser.userPhoneNumber.Number =
      number || foundUser.userPhoneNumber.Number;
    foundUser.Selfie = Selfie || foundUser.Selfie;
    foundUser.address = address || foundUser.address;
    if (!isNaN(latitude) && !isNaN(longitude)) {
      console.log("or here");
      foundUser.geometry.coordinates = [longitude, latitude];
    }

    const notification = {
      id: uuidv4(),
      createdAt: Date.now(),
      title: "Profile update",
      content: "Profile modifications have been updated",
    };
    foundUser.notifications.push(notification);
    foundUser.save();
    res.status(200).send({
      message: "Updated profile successfully",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from editProfile endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.editProvider = async (req, res) => {
  try {
    const id = req.params["id"];
    const token = req["cookies"]["x-tela-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    let foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    } else if (!foundUser.isProvider) {
      return res.status(406).send({
        message: "User is not a provider",
        code: 406,
        success: false,
        date: Date.now(),
      });
    } else if (foundUser.id !== id) {
      return res.status(401).send({
        message: "Unauthorized",
        code: 401,
        success: false,
        date: Date.now(),
      });
    }
    const {
      companyName,
      MF,
      Category,
      subCategory,
      bio,
      photoWork,
      address,
      latitude,
      longitude,
      activityRadius,
      available,
      Languages,
      userFullName,
      Email,
      number,
      Selfie,
      license,
      Status,
    } = req.body;
    const providerInfo = {
      license,
      activityRadius,
      companyName,
      MF,
      Category,
      subCategory,
      bio,
      photoWork,
      address,
      available,
      Languages,
    };
    if(!address || !latitude || !longitude|| !activityRadius|| !available){
      return res.status(400).send({
        message: "Missing informations , please verify and try again",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    foundUser.Status = Status || foundUser.Status;
    foundUser.userFullName = userFullName || foundUser.userFullName;
    foundUser.userEmail.Email = Email || foundUser.userEmail.Email;
    foundUser.userPhoneNumber.Number = number || foundUser.userPhoneNumber.Number;
    foundUser.Selfie = Selfie || foundUser.Selfie;
    foundUser.address = address;
    foundUser.geometry.coordinates = [longitude, latitude];
    foundUser.providerInfo = providerInfo;
 
    const notification = {
      id: uuidv4(),
      createdAt: Date.now(),
      title: "Profile update",
      content: "Profile modifications have been updated",
    };
    foundUser.notifications.push(notification);
    foundUser.save();
    res.status(200).send({
      message: "Updated profile successfully",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from editProvider endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};
exports.completeTransaction = async (req, res) => {
  try {
    const id = req.params["id"];
    const token = req["cookies"]["x-tela-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    const foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    } else if (!foundUser.isProvider) {
      return res.status(406).send({
        message: "User is not a provider",
        code: 406,
        success: false,
        date: Date.now(),
      });
    }
    let foundTransaction = await TransactionModel.findOne({ id });
    if (!foundTransaction) {
      return res.status(404).send({
        message: "Transaction not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    } else if (foundTransaction.status !== 2) {
      return res.status(406).send({
        message: "Invalid transaction status",
        code: 406,
        success: false,
        date: Date.now(),
      });
    } else if (foundTransaction.selectedProvider !== foundUser.id) {
      return res.status(401).send({
        message: "You are not the selected provider for this request",
        code: 401,
        success: false,
        date: Date.now(),
      });
    }
    foundTransaction.status = 3;
    await foundTransaction.save();
    res.status(200).send({
      message: "Request is complete",
      code: 200,
      success: true,
      date: Date.now(),
    });
    const foundRequester = await UserModel.findOne({
      id: foundTransaction.creatorId,
    });
    const notification = {
      id: uuidv4(),
      createdAt: Date.now(),
      title: "Request complete",
      content: "Your request has finished, please proceed to rate the provider",
    };
    foundRequester.notifications.push(notification);
    foundRequester.save();
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from completeTransaction endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};
exports.approveTransaction = async (req, res) => {
  try {
    const { price } = req.body;
    const id = req.params["id"];
    const token = req["cookies"]["x-tela-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    const foundUser = await UserModel.findOne({ id: user.id }).select(
      "userFullName isProvider providerInfo userPhoneNumber Selfie id"
    );
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    let foundTransaction = await TransactionModel.findOne({ id });
    if (!foundTransaction) {
      return res.status(404).send({
        message: "Transaction not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    } else if (foundTransaction.status !== 0 && foundTransaction.status !== 1) {
      return res.status(403).send({
        message: "This transaction is already accessed",
        code: 403,
        success: false,
        date: Date.now(),
      });
    } else if (!foundTransaction.providers.includes(foundUser.id)) {
      return res.status(401).send({
        message: "Request is not related to this user",
        code: 401,
        success: false,
        date: Date.now(),
      });
    }
    const proposal = {
      provider: foundUser,
      proposal: price,
    };
    foundTransaction.proposals.push(proposal);
    foundTransaction.status = 1;
    await foundTransaction.save();
    res.status(200).send({
      message:
        "Your approval is submitted. Waiting for the request to be confirmed.",
      code: 200,
      success: true,
      date: Date.now(),
    });
    const foundRequester = await UserModel.findOne({
      id: foundTransaction.creatorId,
    });
    const notification = {
      id: uuidv4(),
      createdAt: Date.now(),
      title: "Approved",
      content: "A provider or more has accepted your request",
    };
    foundRequester.notifications.push(notification);
    foundRequester.save();
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from approveTransaction endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};
exports.confirmProvider = async (req, res) => {
  try {
    const id = req.params["id"];
    const token = req["cookies"]["x-tela-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    const { idProvider } = req.body;
    const foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundTransaction = await TransactionModel.findOne({ id });
    if (!foundTransaction) {
      return res.status(404).send({
        message: "Transaction not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundProvider = await UserModel.findOne({ id: idProvider });
    if (!foundProvider) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundProvider.isProvider) {
      return res.status(406).send({
        message: "User is not a provider",
        code: 406,
        success: false,
        date: Date.now(),
      });
    }
    let isProviderExist = false;
    foundTransaction.proposals.map((proposal) => {
      if (proposal.provider.id === idProvider) {
        isProviderExist = true;
        foundTransaction.finalPrice = proposal.proposal;
        return;
      }
    });
    if (isProviderExist) {
      foundTransaction.status = 2;
      const event = {
        idEvent: uuidv4(),
        dateEvent: Date.now(),
        event: "Provider confirmed",
        whoCreatedEvent: foundUser.id,
      };
      foundTransaction.events.push(event);
      foundTransaction.selectedProvider = foundProvider.id;
      await foundTransaction.save();
      res.status(200).send({
        message: "Provider confirmed",
        code: 200,
        success: true,
        date: Date.now(),
      });
      const notification = {
        id: uuidv4(),
        createdAt: Date.now(),
        title: "Proposal confirmed",
        content: "Your propasl on a request has been confirmed",
      };
      foundProvider.notifications.push(notification);
      foundProvider.save();
    } else {
      return res.status(404).send({
        message: "Provider not found in transactions proposals",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
  } catch (err) {
    res.status(500).send({
      message:
        "This error is coming from confirmProvider endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.viewProfile = async (req, res) => {
  try {
    const token = req["cookies"]["x-tela-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    const foundUser = await UserModel.findOne({ id: user.id }).select(
      "userFullName isProvider providerInfo userPhoneNumber Selfie address geomtry favProviders id Status userEmail"
    );
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    res.status(200).send({
      message: "Fetched profile",
      code: 200,
      success: true,
      date: Date.now(),
      user: foundUser,
    });
  } catch (err) {
    res.status(500).send({
      message:
        "This error is coming from viewProfile endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.searchProviders = async (req, res) => {
  try {
    const { latitude, longitude, category, transactionId, userId } = req.body;
    let foundTransaction = await TransactionModel.findOne({
      id: transactionId,
    });
    const result = await UserModel.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          distanceField: "dist.calculated",
          query: {
            "providerInfo.available": true,
            "providerInfo.Category": category,
            isProvider: true,
          },
          spherical: true,
        },
      },
    ]);

    const updatePromises = result.map(async (provider) => {
      if (
        provider.providerInfo.Category === category &&
        provider.id !== userId
      ) {
        const isNear = haversine(
          { latitude, longitude },
          {
            latitude: provider.geometry.coordinates[1],
            longitude: provider.geometry.coordinates[0],
          },
          { threshold: provider.providerInfo.activityRadius, unit: "mile" }
        );
        if (isNear) {
          const foundProvider = await UserModel.findOne({ id: provider.id });
          foundProvider.transactions.push(transactionId);
          const notification = {
            id: uuidv4(),
            createdAt: Date.now(),
            titel: "Transaction found",
            content:
              "A new request nearby has been located that might interest you",
          };
          foundProvider.notifications.push(notification);
          foundProvider.save();
          foundTransaction.providers.push(provider.id);
          foundTransaction.save();
        }
      }
    });
    Promise.all(updatePromises);
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from searchProviders endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.createRequest = async (req, res, next) => {
  try {
    const {
      bookingDate,
      category,
      bookingTime,
      address,
      latitude,
      longitude,
      description,
      jobTitle,
      photos,
    } = req.body;
    const token = req["cookies"]["x-tela-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    let foundUser = await UserModel.findOne({
      id: user.id,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const transactionId = uuidv4();
    const newTransaction = new TransactionModel({
      id: transactionId,
      creatorId: foundUser.id,
      bookingDate,
      bookingTime,
      description,
      jobTitle,
      category,
      address,
      "geometry.coordinates": [longitude, latitude],
    });
    if (photos && photos.length > 0) {
      newTransaction.photos = photos;
    }
    const event = {
      idEvent: uuidv4(),
      dateEvent: Date.now(),
      event: "Transaction created",
      whoCreatedEvent: foundUser.id,
    };
    newTransaction.events.push(event);
    await newTransaction.save();
    res.status(200).json({
      message: "Transaction created successfully",
      code: 200,
      success: true,
      date: Date.now(),
    });
    foundUser.transactions.push(transactionId);
    await foundUser.save();
    req.body.transactionId = transactionId;
    req.body.userId = foundUser.id;
    next();
  } catch (err) {
    res.status(500).send({
      message:
        "This error is coming from createRequest endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};
exports.getRequests = async (req, res) => {
  try {
    const token = req["cookies"]["x-tela-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    const foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (foundUser.transactions.length === 0) {
      return res.status(204).send({
        message: "Transactions empty",
        code: 204,
        success: true,
        date: Date.now(),
      });
    }
    const foundTransactions = await TransactionModel.find({
      id: { $in: foundUser.transactions },
    });
    res.status(200).json({
      message: "Transactions fetched",
      code: 200,
      success: true,
      date: Date.now(),
      transactions: foundTransactions,
    });
  } catch (err) {
    res.status(500).send({
      message:
        "This error is coming from getRequests endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.markAsFavorite = async (req, res) => {
  try {
    const id = req.params["id"];
    const token = req["cookies"]["x-tela-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    const foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundProvider = await UserModel.findOne({ id });
    if (!foundProvider) {
      return res.status(404).send({
        message: "Provider not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    } else if (foundProvider.id === foundUser.id) {
      return res.status(406).send({
        message: "You cannot rate yourself",
        code: 406,
        success: false,
        date: Date.now(),
      });
    } else if (!foundProvider.isProvider) {
      return res.status(406).send({
        message: "This user is not a provider",
        code: 406,
        success: false,
        date: Date.now(),
      });
    }
    foundUser.favProviders.push(id);
    await foundUser.save();
    res.status(200).send({
      message: "You set this provider as a favorite",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from markAsFavorite endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.rateProvider = async (req, res) => {
  try {
    const { feedback, rate } = req.body;
    const id = req.params["id"];
    const token = req["cookies"]["x-tela-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    const foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundProvider = await UserModel.findOne({ id });
    if (!foundProvider) {
      return res.status(404).send({
        message: "Provider not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    } else if (foundProvider.id === foundUser.id) {
      return res.status(406).send({
        message: "You cannot rate yourself",
        code: 406,
        success: false,
        date: Date.now(),
      });
    } else if (!foundProvider.isProvider) {
      return res.status(406).send({
        message: "This user is not a provider",
        code: 406,
        success: false,
        date: Date.now(),
      });
    }
    const rateInfo = {
      id: uuidv4(),
      idUser: foundUser.id,
      rate,
      feedback,
    };
    foundProvider.providerInfo.reviews.push(rateInfo);
    foundProvider.save();
    res.status(200).send({
      message: "Thank you for rating this provider",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from markAsFavorite endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getRequest = async (req, res) => {
  try {
    const id = req.params["id"];
    const token = req["cookies"]["x-tela-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    const foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    let foundTransaction = await TransactionModel.findOne({
      id,
    });
    if (!foundTransaction) {
      return res.status(404).send({
        message: "Transaction not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    } else if (
      foundTransaction.creatorId !== foundUser.id &&
      !foundTransaction.providers.includes(foundUser.id)
    ) {
      return res.status(401).send({
        message: "Transaction unrelated to this user",
        code: 401,
        success: false,
        date: Date.now(),
      });
    }
    const foundProviders = await UserModel.find({
      id: { $in: foundTransaction.providers },
    });
    if (foundProviders[0]) {
      foundTransaction.providers = foundProviders;
    }
    return res.status(200).json({
      message: "Transaction fetched",
      code: 200,
      success: true,
      date: Date.now(),
      transaction: foundTransaction,
    });
  } catch (err) {
    res.status(500).send({
      message:
        "This error is coming from getRequest endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const { category } = req.body;
    const foundCategory = await CategoryModel.find({
      categoryName: { $regex: "^" + category },
    });
    if (foundCategory[0]) {
      return res.status(200).json({
        message: "Category found",
        code: 200,
        success: true,
        data: foundCategory,
      });
    }
    return res
      .status(404)
      .json({ message: "No categories found", code: 404, success: false });
  } catch (err) {
    res.status(500).send({
      message:
        "This error is coming from getCategory endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const foundCategory = await CategoryModel.find();
    if (foundCategory[0]) {
      return res.status(200).json({
        message: "Categories found",
        code: 200,
        success: true,
        data: foundCategory,
      });
    }
    return res
      .status(404)
      .json({ message: "No categories found", code: 404, success: false });
  } catch (err) {
    res.status(500).send({
      message:
        "This error is coming from getCategories endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getFavProviders = async (req, res) => {
  try {
    const token = req["cookies"]["x-tela-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    const foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundFavorites = await UserModel.find({
      id: { $in: foundUser.favProviders },
    });
    return res.status(200).json({
      message: "Favorite providers fetched",
      code: 200,
      success: true,
      date: Date.now(),
      favorites: foundFavorites,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getFavProviders endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.declineProvider = async (req, res) => {
  try {
    const token = req["cookies"]["x-tela-token"];
    const { idProvider } = req.body;
    const user = jwt.verify(token, process.env.SECRET_KEY);
    const foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundTransaction = await TransactionModel.findOne({
      id,
    });
    if (!foundTransaction) {
      return res.status(404).send({
        message: "Transaction not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    } else if (foundTransaction.creatorId !== foundUser.id) {
      return res.status(401).send({
        message: "You are not the creator of this request.",
        code: 401,
        success: false,
        date: Date.now(),
      });
    } else if (foundTransaction.status !== 2) {
      return res.status(401).send({
        message: "Unauthorized change",
        code: 401,
        success: false,
        date: Date.now(),
      });
    }
    foundTransaction.proposals.filter((proposal) => {
      return proposal.provider.id !== idProvider;
    });
    foundTransaction.status = 4;
    await foundTransaction.save();
    res.status(200).send({
      message: "This provider has been declined",
      code: 200,
      success: true,
      date: Date.now(),
    });
    const foundProvider = await UserModel.findOne({ id: idProvider });
    const notification = {
      id: uuidv4(),
      createdAt: Date.now(),
      title: "Proposal declined",
      content: "Your propasl on a request has been declined",
    };
    foundProvider.notifications.push(notification);
    foundProvider.save();
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from declineProvider endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.activatePro = async (req, res) => {
  try {
    const token = req["cookies"]["x-tela-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    const foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    } else if (foundUser.isProvider) {
      return res.status(400).send({
        message: "User already has a pro account",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    foundUser.isProvider = true;
    await foundUser.save();
    return res.status(200).send({
      message: "Successfully activated your pro account",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from activatePro endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

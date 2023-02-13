const jwt = require("jsonwebtoken");
exports.isUser = async (req, res, next) => {
  try {
    const token = req["cookies"]["x-tela-token"];
    if (!token) {
      return res.status(403).send({
        message: "Please provide Tela token in the cookies",
        code: 403,
        success: false,
        date: Date.now(),
      });
    } else {
      const user = jwt.verify(token, process.env.SECRET_KEY);
      if (user.role != "Regular") {
        return res.status(403).send({
          message: "Not authorized",
          code: 403,
          success: false,
          date: Date.now(),
        });
      }
      next();
    }
  } catch (err) {
    res.status(500).send({
      message:
        "This error is coming from isUser middleware, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

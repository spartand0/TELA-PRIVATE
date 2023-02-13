const jwt = require("jsonwebtoken");
exports.isProvider = async (req, res, next) => {
  const token = req["cookies"]["x-tela-token"];
  if (!token) {
    res.status(403).send({
      message: "Please provide Tela token in the cookies",
      code: 403,
      success: false,
      date: Date.now(),
    });
  } else {
    try {
      const user = jwt.verify(token, process.env.SECRET_KEY);
      if (!user.provider) {
        return res.status(403).send({
          message: "Not authorized",
          code: 403,
          success: false,
          date: Date.now(),
        });
      }
      next();
    } catch (err) {
      res.status(500).send({
        message:
          "This error is coming from isProvider middleware, please report to the sys administrator !",
        code: 500,
        success: false,
        date: Date.now(),
      });
    }
  }
};

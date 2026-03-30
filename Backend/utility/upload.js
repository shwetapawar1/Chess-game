const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const dotenv = require("dotenv");
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile-pics",
    format: async (req, file) => {
      let extArray = file.originalname.split("."); // profile.images.jpeg
      let extension = extArray[extArray.length - 1]; // [profile, images, jpeg]
      return extension;
    },
  },
});

const parser = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    let extArray = file.originalname.split("."); // originalName -> profile.images.jpeg -> extArray -> [profile, images, jpeg]
    let extension = extArray[extArray.length - 1]; // jpeg
    let allowedExt = ["png", "jpg", "jpeg"];
    if (!allowedExt.includes(extension)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

module.exports = parser;
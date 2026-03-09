const jwt = require("jsonwebtoken");
const {User} = require("../models/user.model");


const verifyAuth = async(req, res, next) => {
     try{
        const {accessToken} = req.cookies;
        if(!accessToken){
            return res.status(401).json({message: "Access token missing"});
        }
        let payload;
        try{
            payload = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
        }catch(err){
            return res. status(401).json({message: err.message});
        }
        const id = payload.sub;
        const user = await User.findById(id).select("-passwordHash");
        if(!user){
            return res.status(401).json({message: "Unauthorized"});
        }

        req.user = user;
        next();
     }
     catch (err){
        return res.status(500).json({message: err.message});
     }

};

module.exports = {verifyAuth};

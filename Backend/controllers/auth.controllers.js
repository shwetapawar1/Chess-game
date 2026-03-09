const { User } = require("../models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");



const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        //if anyone of them missing
        if (!email || !password) {
            return res.status(400).json({ message: "Please fill all the fields" });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User does not exist" });
        }

        // verify password(bcrypt)
        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            return res.status(400).json({ message: "Invalid credentials" });
        }



        ///create access token and refresh token (jwt)
        const accessToken = jwt.sign(
            { sub: user._id, role: user.role },
            process.env.JWT_ACCESS_SECRET,

            { expiresIn: "15m" },
        );


        res.cookie("accessToken", accessToken, {
            httpOnly: true,                                                ///js cannot read the cookie only browser can read it
            secure: process.env.NODE_ENV === "production",                     //// send cookie only to https secure sites
            maxAge: 15 * 60 * 1000,

        });

        const refrehToken = jwt.sign(
            { sub: user._id, role: user.role, type: "refresh" },
            process.env.JWT_REFRESh_SECRET,
            { expiresIn: "7d" },
        );

        res.cookie("refrehToken",refrehToken, {
            httpOnly: true,                                                ///js cannot read the cookie only browser can read it
            secure: process.env.NODE_ENV === "production",                     //// send cookie only to https secure sites
            path: "/api/v1/auth/refresh",
            maxAge: 7 * 24 * 60 * 60 * 1000,

        });
         return res.status(200).json({ message: "OK" });

    }

    catch (err) {
        return res.status(500).json({ message: err.message });
    }

};


////for sign Up

const signup = async(req, res) => {
    try{
        const{name, email , password} = req.body
        if(!name || !email || !password) {
            return res.status(400).json({message: "Please fill all the field"});
        }

        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.status(400).json({message: "User already exists"});
        }
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const user = new User({name,email,passwordHash});
        const savedUser = await user.save();
        if(!savedUser){
            return res.status(500).json({message: "Unable to save user"});
        }
        return res.status(200).json({message: "OK"});

    }catch(err){
           return res.status(500).json({message: err.message});
    }
};

const fetchMe = (req, res) => {
  try {
    const user = req.user;
    return res.status(200).json({ user });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


const logout = (req, res) => {
    try{
        res.clearCookie("accessToken", {
            httpOnly: true,                                              
            secure: process.env.NODE_ENV === "production",
        });

        res.clearCookie("refreshToken",{
              httpOnly: true,                                                
            secure: process.env.NODE_ENV === "production",                    
            path: "/api/v1/auth/refresh",
        });
        return res.status(200).json({message: "OK"});
}catch (err){
    return res.status(500).json({message: err.message});
}
   
};



const refresh =  async(req, res) => {
    try{
        const {refrehToken} = req.cookies;
        if(!refrehToken){
            return res.status(400).json({message: "Refresh token missing"});
        }
        const payload = jwt.verify(refreshToken, process.env.JWT_REFRESh_SECRET);
        if(payload.type !== "refresh"){
            return res.status(400).json({message: " Token type not refresh"});

        }

        const id = payload.sub;
        const user = await User.findById(id);
        if(!user){
            res.clearCookie("refreshToken",{
              httpOnly: true,                                                
            secure: process.env.NODE_ENV === "production",                    
            path: "/api/v1/auth/refresh",
        });
        return res.status(400).json({message: "User not found"});
        }
        const accessToken = jwt.sign(
            { sub: user._id, role: user.role },
            process.env.JWT_REFRESh_SECRET,
            { expiresIn: "15m" },
        );
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 15 * 60 * 1000,
        })


    }catch(err){
         return res.status(500).json({message: err.message});
    }
}



module.exports = { login, signup ,fetchMe, logout, refresh};


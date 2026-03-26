const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    avatar: {
        type: String
    },
    confirmPassword: {
        type: String,
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    role:{
        type:String,
        enum: ["admin", "user", "partner"],
        required: true,
        default: "user"
    },
    partnerRequestStatus: {
        type: String,
        enum: ["none", "pending", "approved", "rejected", "blocked"],
        default: "none"
    },
    partnerRequestSubmittedAt: {
        type: Date
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    blockReason: {
        type: String
    },
    blockedAt: {
        type: Date
    },
    otp: {
        type: String
    },
    otpExpiry: {
        type: Date
    }
}, {timestamps: true});

userSchema.pre("save", function(next){
    console.log("hello from pre");
    if(this.confirmPassword){
        this.confirmPassword = undefined;
    }
    next();
})

// userSchema.pre("save", function(next){
//     console.log("hello from pre");
//     const date = new Date();
//     this.updatedAt = date;
//     if(!this.createdAt){
//         this.createdAt = date;
//     }
//     next();
// })

const userModel = mongoose.model("users", userSchema);

module.exports = userModel;

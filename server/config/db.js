const mongoose = require("mongoose");
const dbURL = process.env.DB_URL;
const connectDB = async () =>{
    try{
        await mongoose.connect(dbURL);
        console.log("connected to db");
        return true;
    }catch(err){
        // old code:
        // console.error(err);
        // process.exit(1); // <-- important: stop server if DB isn't connected
        console.error(err);
        return false;
    }
}

module.exports = connectDB

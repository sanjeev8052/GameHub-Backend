import mongoose from "mongoose";

const connectDB = async () => {
    const res = await mongoose.connect(process.env.MONGODB_URI).then((res) => {
        console.log("MongoDB connected", res.connection.host);
    }).catch((err) => {
        console.log(err);
    });

};

export default connectDB;
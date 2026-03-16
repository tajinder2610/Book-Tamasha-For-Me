import {axiosInstance} from "./index";

export const RegisterUser = async(value) => {
    try{
        const response = await axiosInstance.post("/api/users/register", value);
        return response.data;
    }catch(err){
        return {
            success: false,
            message: err?.response?.data?.message || err.message,
        };
    }
}

export const LoginUser = async(value) => {
    try{
        const response = await axiosInstance.post("/api/users/login", value);
        return response.data;
    }catch(err){
        return {
            success: false,
            message: err?.response?.data?.message || err.message,
        };
    }
}

export const CurrentUser = async() => {
    // Old code:
    // try{
    //     const response = await axiosInstance.get("/api/users/get-current-user");
    //     return response.data?.data;
    // }catch(err){
    //     throw err;
    // }
    const response = await axiosInstance.get("/api/users/get-current-user");
    return response.data?.data;
}

export const ForgetPassword = async(value) => {
    try{
        const response = await axiosInstance.patch("/api/users/forgetpassword", value);
        return response.data;
    }catch(err){
        return {
            success: false,
            message: err?.response?.data?.message || err.message,
        };
    }
}

export const ResetPassword = async(email, value) => {
    try{
        const response = await axiosInstance.patch(`/api/users/resetpassword/${email}`, value);
        return response.data;
    }catch(err){
        return {
            success: false,
            message: err?.response?.data?.message || err.message,
        };
    }
}

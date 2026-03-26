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
            data: err?.response?.data?.data,
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

export const GetPartnerRequests = async () => {
    try{
        const response = await axiosInstance.get("/api/users/partner-requests");
        return response.data;
    }catch(err){
        return {
            success: false,
            message: err?.response?.data?.message || err.message,
        };
    }
}

export const UpdatePartnerRequestStatus = async (id, status) => {
    try{
        const response = await axiosInstance.patch(`/api/users/partner-requests/${id}`, { status });
        return response.data;
    }catch(err){
        return {
            success: false,
            message: err?.response?.data?.message || err.message,
        };
    }
}

export const SearchUsersForBlocking = async (search) => {
    try{
        const response = await axiosInstance.get(`/api/users/search?search=${encodeURIComponent(search)}`);
        return response.data;
    }catch(err){
        return {
            success: false,
            message: err?.response?.data?.message || err.message,
        };
    }
}

export const GetBlockedUsers = async () => {
    try{
        const response = await axiosInstance.get("/api/users/blocked-users");
        return response.data;
    }catch(err){
        return {
            success: false,
            message: err?.response?.data?.message || err.message,
        };
    }
}

export const BlockUser = async (payload) => {
    try{
        const response = await axiosInstance.post("/api/users/block", payload);
        return response.data;
    }catch(err){
        return {
            success: false,
            message: err?.response?.data?.message || err.message,
        };
    }
}

export const UnblockUser = async (id) => {
    try{
        const response = await axiosInstance.patch(`/api/users/blocked-users/${id}/unblock`);
        return response.data;
    }catch(err){
        return {
            success: false,
            message: err?.response?.data?.message || err.message,
        };
    }
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

export const CompleteGoogleSignup = async(value) => {
    try{
        const response = await axiosInstance.post("/api/users/oauth/complete", value);
        return response.data;
    }catch(err){
        return {
            success: false,
            message: err?.response?.data?.message || err.message,
        };
    }
}

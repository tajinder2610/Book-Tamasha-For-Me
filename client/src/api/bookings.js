import { axiosInstance } from ".";


export const MakePayment = async (value) => {
 try {  
   const response = await axiosInstance.post("/api/booking/make-payment", value);
   return response.data;
 } catch (err) {
   return {
     success: false,
     message: err?.response?.data?.message || err.message,
   };
 }
};

export const CreateCheckoutSession = async (payload) => {
 try {
   const response = await axiosInstance.post("/api/booking/create-checkout-session", payload);
   return response.data;
 } catch (err) {
   return {
     success: false,
     message: err?.response?.data?.message || err.message,
   };
 }
};

export const ConfirmCheckoutSession = async (payload) => {
 try {
   const response = await axiosInstance.post("/api/booking/confirm-checkout-session", payload);
   return response.data;
 } catch (err) {
   return {
     success: false,
     message: err?.response?.data?.message || err.message,
   };
 }
};


export const bookShow = async (payload) => {
 try {
   const response = await axiosInstance.post(
     "/api/booking/book-show",
     payload
   );
   return response.data;
 } catch (err) {
   return {
     success: false,
     message: err?.response?.data?.message || err.message,
   };
 }
};


export const GetAllBookings = async (payload) => {
 try {
   const response = await axiosInstance.get(
     `/api/booking/${payload.userId}`
   );
   return response.data;
 } catch (err) {
   return {
     success: false,
     message: err?.response?.data?.message || err.message,
   };
 }
};

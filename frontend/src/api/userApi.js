import axiosClient from "./axiosClient";

// Lấy danh sách tài khoản (Chỉ Admin)
export const getUsers = async () => {
  const response = await axiosClient.get("/users");
  return response;
};

// Tạo tài khoản mới (Chỉ Admin)
export const createUser = async (userData) => {
  const response = await axiosClient.post("/users", userData);
  return response;
};

// Xóa tài khoản (Chỉ Admin)
export const deleteUser = async (id) => {
  const response = await axiosClient.delete(`/users/${id}`);
  return response;
};


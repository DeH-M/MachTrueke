import { baseFetch } from "./authApi"; // si ya tienes baseFetch, reúsalo

export const usersApi = {
  async getPublicProfile(userId) {
    const res = await baseFetch(`/api/public/profile/${userId}`);
    return res; // { user, products }
  },
};

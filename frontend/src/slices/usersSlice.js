import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

export const fetchUser = createAsyncThunk(
  "users/fetchUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to fetch user",
      );
    }
  },
);

export const updateUser = createAsyncThunk(
  "users/updateUser",
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/users/${userId}`, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to update user",
      );
    }
  },
);

export const fetchUserPosts = createAsyncThunk(
  "users/fetchUserPosts",
  async ({ userId, page = 1 }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/${userId}/posts`, {
        params: { page },
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to fetch user posts",
      );
    }
  },
);

export const fetchUserPhotos = createAsyncThunk(
  "users/fetchUserPhotos",
  async ({ userId, page = 1 }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/${userId}/photos`, {
        params: { page },
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to fetch user photos",
      );
    }
  },
);

const initialState = {
  currentUser: null,
  userPosts: [],
  userPhotos: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  loading: false,
  error: null,
};

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearCurrentUser: (state) => {
      state.currentUser = null;
      state.userPosts = [];
      state.userPhotos = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch User
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update User
      .addCase(updateUser.fulfilled, (state, action) => {
        state.currentUser = action.payload;
      })
      // Fetch User Posts
      .addCase(fetchUserPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.userPosts = action.payload.posts;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchUserPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch User Photos
      .addCase(fetchUserPhotos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserPhotos.fulfilled, (state, action) => {
        state.loading = false;
        state.userPhotos = action.payload.photos;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchUserPhotos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCurrentUser, clearError } = usersSlice.actions;
export default usersSlice.reducer;

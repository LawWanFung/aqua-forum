import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

export const fetchPhotos = createAsyncThunk(
  "photos/fetchPhotos",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/photos", { params });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to fetch photos",
      );
    }
  },
);

export const uploadPhoto = createAsyncThunk(
  "photos/uploadPhoto",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post("/photos/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to upload photo",
      );
    }
  },
);

export const deletePhoto = createAsyncThunk(
  "photos/deletePhoto",
  async (photoId, { rejectWithValue }) => {
    try {
      await api.delete(`/photos/${photoId}`);
      return photoId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to delete photo",
      );
    }
  },
);

export const likePhoto = createAsyncThunk(
  "photos/likePhoto",
  async (photoId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/photos/${photoId}/like`);
      return { photoId, ...response.data.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to like photo",
      );
    }
  },
);

const initialState = {
  photos: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  loading: false,
  uploading: false,
  error: null,
};

const photosSlice = createSlice({
  name: "photos",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Photos
      .addCase(fetchPhotos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPhotos.fulfilled, (state, action) => {
        state.loading = false;
        state.photos = action.payload.photos;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPhotos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Upload Photo
      .addCase(uploadPhoto.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadPhoto.fulfilled, (state, action) => {
        state.uploading = false;
        state.photos.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(uploadPhoto.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload;
      })
      // Delete Photo
      .addCase(deletePhoto.fulfilled, (state, action) => {
        state.photos = state.photos.filter((p) => p._id !== action.payload);
        state.pagination.total -= 1;
      })
      // Like Photo
      .addCase(likePhoto.fulfilled, (state, action) => {
        const { photoId, liked, likeCount } = action.payload;
        const photo = state.photos.find((p) => p._id === photoId);
        if (photo) {
          photo.metadata.likes = likeCount;
        }
      });
  },
});

export const { clearError } = photosSlice.actions;
export default photosSlice.reducer;

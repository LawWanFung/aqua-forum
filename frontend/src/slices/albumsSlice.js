import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

export const fetchAlbums = createAsyncThunk(
  "albums/fetchAlbums",
  async ({ page = 1 }, { rejectWithValue }) => {
    try {
      const response = await api.get("/albums", {
        params: { page, limit: 20 },
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Error fetching albums" },
      );
    }
  },
);

export const fetchPublicAlbums = createAsyncThunk(
  "albums/fetchPublicAlbums",
  async ({ userId, page = 1 }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/albums/public/${userId}`, {
        params: { page, limit: 20 },
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Error fetching albums" },
      );
    }
  },
);

export const fetchAlbum = createAsyncThunk(
  "albums/fetchAlbum",
  async (albumId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/albums/${albumId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Error fetching album" },
      );
    }
  },
);

export const createAlbum = createAsyncThunk(
  "albums/createAlbum",
  async (albumData, { rejectWithValue }) => {
    try {
      const response = await api.post("/albums", albumData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Error creating album" },
      );
    }
  },
);

export const updateAlbum = createAsyncThunk(
  "albums/updateAlbum",
  async ({ albumId, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/albums/${albumId}`, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Error updating album" },
      );
    }
  },
);

export const deleteAlbum = createAsyncThunk(
  "albums/deleteAlbum",
  async (albumId, { rejectWithValue }) => {
    try {
      await api.delete(`/albums/${albumId}`);
      return albumId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Error deleting album" },
      );
    }
  },
);

export const addPhotoToAlbum = createAsyncThunk(
  "albums/addPhoto",
  async ({ albumId, photoId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/albums/${albumId}/photos/${photoId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Error adding photo" },
      );
    }
  },
);

export const removePhotoFromAlbum = createAsyncThunk(
  "albums/removePhoto",
  async ({ albumId, photoId }, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/albums/${albumId}/photos/${photoId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: "Error removing photo" },
      );
    }
  },
);

const albumsSlice = createSlice({
  name: "albums",
  initialState: {
    albums: [],
    currentAlbum: null,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    },
    loading: false,
    error: null,
  },
  reducers: {
    clearAlbumsError: (state) => {
      state.error = null;
    },
    clearCurrentAlbum: (state) => {
      state.currentAlbum = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch albums
      .addCase(fetchAlbums.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlbums.fulfilled, (state, action) => {
        state.loading = false;
        state.albums = action.payload.albums;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchAlbums.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch public albums
      .addCase(fetchPublicAlbums.fulfilled, (state, action) => {
        state.albums = action.payload.albums;
        state.pagination = action.payload.pagination;
      })
      // Fetch single album
      .addCase(fetchAlbum.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAlbum.fulfilled, (state, action) => {
        state.loading = false;
        state.currentAlbum = action.payload;
      })
      .addCase(fetchAlbum.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create album
      .addCase(createAlbum.fulfilled, (state, action) => {
        state.albums.unshift(action.payload);
      })
      // Update album
      .addCase(updateAlbum.fulfilled, (state, action) => {
        const index = state.albums.findIndex(
          (a) => a._id === action.payload._id,
        );
        if (index !== -1) {
          state.albums[index] = action.payload;
        }
        if (state.currentAlbum?._id === action.payload._id) {
          state.currentAlbum = action.payload;
        }
      })
      // Delete album
      .addCase(deleteAlbum.fulfilled, (state, action) => {
        state.albums = state.albums.filter((a) => a._id !== action.payload);
      });
  },
});

export const { clearAlbumsError, clearCurrentAlbum } = albumsSlice.actions;
export default albumsSlice.reducer;

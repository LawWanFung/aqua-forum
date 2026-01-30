import React, { useState, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Card,
  CardMedia,
  CardContent,
  LinearProgress,
  Alert,
} from "@mui/material";
import { CloudUpload, Delete, AddPhotoAlternate } from "@mui/icons-material";
import api from "../api";

const ImageUpload = ({ value = [], onChange, maxImages = 5 }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleUpload = useCallback(
    async (event) => {
      const files = Array.from(event.target.files);

      if (files.length === 0) return;

      if (value.length + files.length > maxImages) {
        setError(`Maximum ${maxImages} images allowed`);
        return;
      }

      setUploading(true);
      setUploadProgress(0);
      setError(null);

      try {
        const uploadedImages = [];

        for (let i = 0; i < files.length; i++) {
          const formData = new FormData();
          formData.append("image", files[i]);
          formData.append("title", `Post image ${value.length + i + 1}`);

          const response = await api.post("/photos/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          const photo = response.data.data;
          uploadedImages.push({
            type: "image",
            url: photo.imageUrl,
            thumbnailUrl: photo.thumbnailUrl || photo.imageUrl,
          });

          // Update progress
          setUploadProgress(((i + 1) / files.length) * 100);
        }

        // Add new images to existing ones
        const newValue = [...value, ...uploadedImages];
        onChange(newValue);
      } catch (err) {
        setError(err.response?.data?.error?.message || "Upload failed");
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [value, onChange, maxImages],
  );

  const handleRemove = useCallback(
    (index) => {
      const newValue = value.filter((_, i) => i !== index);
      onChange(newValue);
    },
    [value, onChange],
  );

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" gutterBottom fontWeight={600}>
        Upload Images
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Upload up to {maxImages} images for your post (optional)
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {uploading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "flex-start",
        }}
      >
        {/* Upload Button */}
        {value.length < maxImages && (
          <Button
            component="label"
            variant="outlined"
            startIcon={<AddPhotoAlternate />}
            sx={{
              width: 150,
              height: 150,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              borderStyle: "dashed",
              borderWidth: 2,
            }}
          >
            <CloudUpload sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="caption" align="center">
              Add Image
            </Typography>
            <input
              type="file"
              hidden
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={handleUpload}
            />
          </Button>
        )}

        {/* Image Previews */}
        {value.map((image, index) => (
          <Card key={index} sx={{ width: 150, position: "relative" }}>
            <CardMedia
              component="img"
              height="100"
              image={image.thumbnailUrl || image.url}
              alt={`Image ${index + 1}`}
              sx={{ objectFit: "cover" }}
            />
            <IconButton
              size="small"
              onClick={() => handleRemove(index)}
              sx={{
                position: "absolute",
                top: 4,
                right: 4,
                backgroundColor: "rgba(0,0,0,0.6)",
                color: "white",
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.8)",
                },
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
            <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
              <Typography variant="caption" noWrap>
                Image {index + 1}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default ImageUpload;

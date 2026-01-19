import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Skeleton,
  IconButton,
  Chip,
} from "@mui/material";
import { Favorite, FavoriteBorder, CloudUpload } from "@mui/icons-material";
import { fetchPhotos, uploadPhoto, likePhoto } from "../slices/photosSlice";
import { useNavigate } from "react-router-dom";

const Gallery = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { photos, loading, error, uploading, pagination } = useSelector(
    (state) => state.photos,
  );
  const { isAuthenticated } = useSelector((state) => state.auth);
  const fileInputRef = useRef(null);

  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: "",
    description: "",
    aquariumType: "Other",
    file: null,
    preview: null,
  });

  useEffect(() => {
    dispatch(fetchPhotos({}));
  }, [dispatch]);

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    dispatch(
      fetchPhotos({
        aquariumType: e.target.value !== "all" ? e.target.value : undefined,
      }),
    );
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    // Filter locally for MVP
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadData((prev) => ({
        ...prev,
        file,
        preview: URL.createObjectURL(file),
      }));
      setUploadDialogOpen(true);
    }
  };

  const handleUpload = async () => {
    if (!uploadData.title || !uploadData.file) return;

    const formData = new FormData();
    formData.append("image", uploadData.file);
    formData.append("title", uploadData.title);
    formData.append("description", uploadData.description);
    formData.append("aquariumType", uploadData.aquariumType);

    await dispatch(uploadPhoto(formData));
    setUploadDialogOpen(false);
    setUploadData({
      title: "",
      description: "",
      aquariumType: "Other",
      file: null,
      preview: null,
    });
    dispatch(fetchPhotos({}));
  };

  const handleLike = (photoId) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    dispatch(likePhoto(photoId));
  };

  const getAquariumTypeColor = (type) => {
    switch (type) {
      case "Freshwater":
        return "#2196f3";
      case "Saltwater":
        return "#00bcd4";
      case "Planted":
        return "#4caf50";
      default:
        return "#9e9e9e";
    }
  };

  const filteredPhotos = photos.filter((photo) => {
    if (searchQuery) {
      return (
        photo.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.tags?.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      );
    }
    return true;
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
            Photo Gallery 🐠
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Browse amazing aquarium photos from our community
          </Typography>
        </Box>
        {isAuthenticated && (
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload Photo"}
          </Button>
        )}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept="image/*"
          onChange={handleFileSelect}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
        <TextField
          placeholder="Search photos..."
          value={searchQuery}
          onChange={handleSearch}
          sx={{ flexGrow: 1 }}
          size="small"
        />
        <FormControl sx={{ minWidth: 150 }} size="small">
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={filter}
            onChange={handleFilterChange}
            label="Filter by Type"
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="Freshwater">Freshwater</MenuItem>
            <MenuItem value="Saltwater">Saltwater</MenuItem>
            <MenuItem value="Planted">Planted</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && photos.length === 0 ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card>
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="60%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : filteredPhotos.length > 0 ? (
        <Grid container spacing={3}>
          {filteredPhotos.map((photo) => (
            <Grid item xs={12} sm={6} md={4} key={photo._id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box sx={{ position: "relative" }}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={photo.imageUrl}
                    alt={photo.title}
                    sx={{ objectFit: "cover" }}
                  />
                  <Chip
                    label={photo.aquariumType}
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      bgcolor: getAquariumTypeColor(photo.aquariumType),
                      color: "white",
                    }}
                  />
                </Box>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" noWrap>
                    {photo.title}
                  </Typography>
                  {photo.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {photo.description}
                    </Typography>
                  )}
                  {photo.tags?.length > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.5,
                        mt: 1,
                      }}
                    >
                      {photo.tags.slice(0, 3).map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleLike(photo._id)}
                    >
                      <Favorite
                        color={photo.likes?.length > 0 ? "error" : "inherit"}
                      />
                    </IconButton>
                    <Typography variant="body2" color="text.secondary">
                      {photo.metadata?.likes || 0}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    by {photo.user?.username}
                  </Typography>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No photos found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isAuthenticated
              ? "Be the first to share your aquarium photo!"
              : "Sign in to upload photos"}
          </Typography>
        </Box>
      )}

      {/* Upload Dialog */}
      {uploadDialogOpen && (
        <Card
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            maxWidth: "90%",
            zIndex: 1300,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upload Photo
            </Typography>
            {uploadData.preview && (
              <Box
                component="img"
                src={uploadData.preview}
                alt="Preview"
                sx={{
                  width: "100%",
                  height: 200,
                  objectFit: "cover",
                  borderRadius: 1,
                  mb: 2,
                }}
              />
            )}
            <TextField
              fullWidth
              label="Title"
              value={uploadData.title}
              onChange={(e) =>
                setUploadData((prev) => ({ ...prev, title: e.target.value }))
              }
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              value={uploadData.description}
              onChange={(e) =>
                setUploadData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Aquarium Type</InputLabel>
              <Select
                value={uploadData.aquariumType}
                onChange={(e) =>
                  setUploadData((prev) => ({
                    ...prev,
                    aquariumType: e.target.value,
                  }))
                }
                label="Aquarium Type"
              >
                <MenuItem value="Freshwater">Freshwater</MenuItem>
                <MenuItem value="Saltwater">Saltwater</MenuItem>
                <MenuItem value="Planted">Planted</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={!uploadData.title}
              >
                Upload
              </Button>
              <Button
                variant="outlined"
                onClick={() => setUploadDialogOpen(false)}
              >
                Cancel
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default Gallery;

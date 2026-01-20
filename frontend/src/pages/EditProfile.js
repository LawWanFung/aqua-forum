import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  Alert,
  CircularProgress,
  Grid,
  IconButton,
} from "@mui/material";
import { PhotoCamera, Save, ArrowBack } from "@mui/icons-material";
import { updateUser, fetchUser } from "../slices/usersSlice";

const EditProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentUser, loading, error } = useSelector((state) => state.users);
  const { user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    location: "",
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (userId) {
      dispatch(fetchUser(userId));
    }
  }, [dispatch, userId]);

  useEffect(() => {
    if (currentUser) {
      setFormData({
        username: currentUser.username || "",
        bio: currentUser.profile?.bio || "",
        location: currentUser.profile?.location || "",
      });
      if (currentUser.profile?.avatar) {
        setAvatarPreview(currentUser.profile?.avatar);
      }
    }
  }, [currentUser]);

  const isOwner = user?._id === userId;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setSuccess(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors((prev) => ({
          ...prev,
          avatar: "File size must be less than 5MB",
        }));
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setFormErrors((prev) => ({ ...prev, avatar: "" }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.username.trim()) {
      errors.username = "Username is required";
    } else if (formData.username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (formData.username.length > 30) {
      errors.username = "Username cannot exceed 30 characters";
    }
    if (formData.bio && formData.bio.length > 500) {
      errors.bio = "Bio cannot exceed 500 characters";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOwner) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("username", formData.username);
    formDataToSend.append("bio", formData.bio);
    formDataToSend.append("location", formData.location);
    if (avatarFile) {
      formDataToSend.append("avatar", avatarFile);
    }

    const result = await dispatch(updateUser({ userId, data: formDataToSend }));

    if (!result.error) {
      setSuccess(true);
      setAvatarFile(null);
    }
  };

  if (!isOwner) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">You can only edit your own profile</Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(`/profile/${userId}`)}
        sx={{ mb: 3 }}
      >
        Back to Profile
      </Button>

      <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
        Edit Profile 🐠
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Update your profile information
      </Typography>

      <Card>
        <CardContent sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Profile updated successfully!
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            {/* Avatar Section */}
            <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
              <Box sx={{ position: "relative" }}>
                <Avatar
                  src={avatarPreview}
                  sx={{
                    width: 100,
                    height: 100,
                    bgcolor: "primary.main",
                    fontSize: 40,
                  }}
                >
                  {formData.username?.charAt(0).toUpperCase()}
                </Avatar>
                <IconButton
                  component="label"
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    bgcolor: "background.paper",
                    boxShadow: 1,
                    "&:hover": { bgcolor: "background.default" },
                  }}
                  size="small"
                >
                  <PhotoCamera fontSize="small" />
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleFileSelect}
                  />
                </IconButton>
              </Box>
              <Box sx={{ ml: 3 }}>
                <Typography variant="h6">Profile Photo</Typography>
                <Typography variant="body2" color="text.secondary">
                  Click the camera icon to upload a new photo
                </Typography>
                {formErrors.avatar && (
                  <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                    {formErrors.avatar}
                  </Typography>
                )}
              </Box>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  error={!!formErrors.username}
                  helperText={formErrors.username || "Your unique username"}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  error={!!formErrors.bio}
                  helperText={
                    formErrors.bio || "Tell us about yourself and your aquarium"
                  }
                  multiline
                  rows={4}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Hong Kong, New York"
                />
              </Grid>
            </Grid>

            <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={
                  loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <Save />
                  )
                }
                disabled={loading}
              >
                Save Changes
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate(`/profile/${userId}`)}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default EditProfile;

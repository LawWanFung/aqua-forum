import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Grid,
  Button,
  Chip,
  Tabs,
  Tab,
  Alert,
  Skeleton,
  CircularProgress,
} from "@mui/material";
import { PhotoCamera, Edit } from "@mui/icons-material";
import {
  fetchUser,
  fetchUserPosts,
  fetchUserPhotos,
} from "../slices/usersSlice";
import { fetchPosts } from "../slices/postsSlice";
import { fetchPhotos } from "../slices/photosSlice";

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const ProfilePostCard = ({ post }) => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Typography
        variant="h6"
        component={Link}
        to={`/post/${post._id}`}
        sx={{ textDecoration: "none", color: "inherit", display: "block" }}
      >
        {post.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {formatDate(post.metadata?.createdAt)}
      </Typography>
      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
        <Chip size="small" label={`${post.metadata?.likeCount || 0} likes`} />
        <Chip size="small" label={`${post.metadata?.viewCount || 0} views`} />
      </Box>
    </CardContent>
  </Card>
);

const ProfilePhotoCard = ({ photo }) => (
  <Card sx={{ height: "100%" }}>
    <Box
      component="img"
      src={photo.imageUrl}
      alt={photo.title}
      sx={{
        width: "100%",
        height: 200,
        objectFit: "cover",
      }}
    />
    <CardContent>
      <Typography variant="subtitle1" noWrap>
        {photo.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" noWrap>
        {photo.aquariumType}
      </Typography>
    </CardContent>
  </Card>
);

const Profile = () => {
  const { userId } = useParams();
  const dispatch = useDispatch();
  const { currentUser, userPosts, userPhotos, loading, error } = useSelector(
    (state) => state.users,
  );
  const { user } = useSelector((state) => state.auth);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    dispatch(fetchUser(userId));
    dispatch(fetchUserPosts({ userId }));
    dispatch(fetchUserPhotos({ userId }));
  }, [dispatch, userId]);

  const isOwner = user?._id === userId;

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton
          variant="rectangular"
          height={200}
          sx={{ borderRadius: 1, mb: 3 }}
        />
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Skeleton variant="circular" width={120} height={120} />
            <Skeleton variant="text" width="80%" height={32} sx={{ mt: 2 }} />
            <Skeleton variant="text" width="60%" />
          </Grid>
          <Grid item xs={12} md={8}>
            <Skeleton
              variant="rectangular"
              height={400}
              sx={{ borderRadius: 1 }}
            />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!currentUser) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">User not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Card sx={{ mb: 4 }}>
        <Box
          sx={{
            height: 200,
            background: "linear-gradient(135deg, #1976d2 0%, #26a69a 100%)",
            display: "flex",
            alignItems: "flex-end",
            p: 3,
          }}
        >
          <Avatar
            src={currentUser.profile?.avatar}
            sx={{
              width: 120,
              height: 120,
              border: "4px solid white",
              boxShadow: 3,
              bgcolor: "primary.main",
              fontSize: 48,
            }}
          >
            {currentUser.username?.charAt(0).toUpperCase()}
          </Avatar>
        </Box>
        <CardContent sx={{ pt: 0 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mt: 2,
            }}
          >
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {currentUser.username}
              </Typography>
              {currentUser.profile?.bio && (
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {currentUser.profile.bio}
                </Typography>
              )}
              {currentUser.profile?.location && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  📍 {currentUser.profile.location}
                </Typography>
              )}
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Joined {formatDate(currentUser.profile?.joinDate)}
              </Typography>
            </Box>
            {isOwner && (
              <Button
                component={Link}
                to={`/profile/${userId}/edit`}
                variant="outlined"
                startIcon={<Edit />}
              >
                Edit Profile
              </Button>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 3, mt: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {currentUser.stats?.postCount || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Posts
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {currentUser.stats?.photoCount || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Photos
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {currentUser.stats?.followerCount || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Followers
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label={`Posts (${userPosts.length})`} />
          <Tab label={`Photos (${userPhotos.length})`} />
        </Tabs>

        <CardContent>
          {tabValue === 0 && (
            <>
              {userPosts.length > 0 ? (
                userPosts.map((post) => (
                  <ProfilePostCard key={post._id} post={post} />
                ))
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No posts yet
                  </Typography>
                  {isOwner && (
                    <Button
                      component={Link}
                      to="/create"
                      variant="contained"
                      startIcon={<PhotoCamera />}
                      sx={{ mt: 2 }}
                    >
                      Create Your First Post
                    </Button>
                  )}
                </Box>
              )}
            </>
          )}

          {tabValue === 1 && (
            <>
              {userPhotos.length > 0 ? (
                <Grid container spacing={2}>
                  {userPhotos.map((photo) => (
                    <Grid item xs={6} sm={4} md={3} key={photo._id}>
                      <ProfilePhotoCard photo={photo} />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No photos yet
                  </Typography>
                  {isOwner && (
                    <Button
                      component={Link}
                      to="/gallery"
                      variant="contained"
                      startIcon={<PhotoCamera />}
                      sx={{ mt: 2 }}
                    >
                      Upload Your First Photo
                    </Button>
                  )}
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default Profile;

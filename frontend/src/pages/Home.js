import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  Skeleton,
  Alert,
  IconButton,
  Tabs,
  Tab,
} from "@mui/material";
import { Favorite, Visibility, Bookmark, AddCircle } from "@mui/icons-material";
import {
  fetchPosts,
  fetchBoards,
  fetchPostsByBoard,
  setSelectedBoard,
} from "../slices/postsSlice";

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const PostCard = ({ post }) => {
  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Boards */}
        {post.boards?.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
            {post.boards.slice(0, 3).map((board, index) => (
              <Chip
                key={index}
                label={`${board.icon} ${board.name}`}
                size="small"
                sx={{
                  backgroundColor: board.color + "20",
                  fontSize: 11,
                }}
              />
            ))}
          </Box>
        )}

        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Avatar
            src={post.user?.profile?.avatar}
            sx={{ width: 32, height: 32, mr: 1 }}
          >
            {post.user?.username?.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2" color="text.secondary">
            {post.user?.username}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ ml: "auto" }}
          >
            {formatDate(post.metadata?.createdAt)}
          </Typography>
        </Box>

        <Typography
          variant="h6"
          component={Link}
          to={`/post/${post._id}`}
          sx={{
            textDecoration: "none",
            color: "inherit",
            display: "block",
            mb: 1,
          }}
        >
          {post.title}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {post.content}
        </Typography>

        {post.tags?.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {post.tags.slice(0, 5).map((tag, index) => (
              <Chip
                key={index}
                label={typeof tag === "object" ? tag.tag : tag}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Visibility fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {post.metadata?.viewCount || 0}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Favorite fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {post.metadata?.likeCount || 0}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" color="inherit">
          <Bookmark fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
};

const Home = () => {
  const dispatch = useDispatch();
  const { posts, boards, loading, error, pagination, selectedBoard } =
    useSelector((state) => state.posts);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    dispatch(fetchBoards());
  }, [dispatch]);

  useEffect(() => {
    const boardId = searchParams.get("board");
    if (boardId) {
      dispatch(fetchPostsByBoard({ boardId, params: { page: 1 } }));
      dispatch(setSelectedBoard(boardId));
    } else {
      dispatch(fetchPosts({ page: 1 }));
      dispatch(setSelectedBoard(null));
    }
  }, [dispatch, searchParams]);

  const handleBoardSelect = (boardId) => {
    if (boardId) {
      setSearchParams({ board: boardId });
    } else {
      setSearchParams({});
    }
  };

  const handleLoadMore = () => {
    const boardId = searchParams.get("board");
    if (boardId) {
      dispatch(
        fetchPostsByBoard({ boardId, params: { page: pagination.page + 1 } }),
      );
    } else {
      dispatch(fetchPosts({ page: pagination.page + 1 }));
    }
  };

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  // Find selected board info
  const currentBoardId = searchParams.get("board");
  const currentBoard = currentBoardId
    ? boards.find((b) => b._id === currentBoardId)
    : null;

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
          Welcome to Aqua Forum 🐠
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Share your aquarium experiences, ask questions, and connect with
          fellow enthusiasts!
        </Typography>
      </Box>

      {/* Board Navigation */}
      <Box sx={{ mb: 4 }}>
        <Tabs
          value={currentBoardId || ""}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="全部" value="" onClick={() => handleBoardSelect(null)} />
          {boards.map((board) => (
            <Tab
              key={board._id}
              value={board._id}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <span>{board.icon}</span>
                  <span>{board.name}</span>
                  {board.postCount !== undefined && (
                    <Chip
                      label={board.postCount}
                      size="small"
                      sx={{ height: 20, fontSize: 10 }}
                    />
                  )}
                </Box>
              }
              onClick={() => handleBoardSelect(board._id)}
            />
          ))}
        </Tabs>
      </Box>

      {/* Current Board Info */}
      {currentBoard && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 3,
            p: 2,
            borderRadius: 1,
            backgroundColor: currentBoard.color + "10",
            border: "1px solid",
            borderColor: currentBoard.color + "30",
          }}
        >
          <Typography variant="h5" sx={{ mr: 2 }}>
            {currentBoard.icon}
          </Typography>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">{currentBoard.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {currentBoard.description}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleBoardSelect(null)}
          >
            回到全部
          </Button>
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" component="h2" fontWeight={600}>
          {currentBoard ? `${currentBoard.name} 的文章` : "Recent Posts"}
        </Typography>
        <Button
          component={Link}
          to={currentBoardId ? `/create?board=${currentBoardId}` : "/create"}
          variant="contained"
          startIcon={<AddCircle />}
        >
          Create Post
        </Button>
      </Box>

      {loading && posts.length === 0 ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card>
                <CardContent>
                  <Skeleton
                    variant="circular"
                    width={32}
                    height={32}
                    sx={{ mb: 1 }}
                  />
                  <Skeleton variant="text" width="80%" height={28} />
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="60%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : posts.length > 0 ? (
        <>
          <Grid container spacing={3}>
            {posts.map((post) => (
              <Grid item xs={12} sm={6} md={4} key={post._id}>
                <PostCard post={post} />
              </Grid>
            ))}
          </Grid>

          {pagination.page < pagination.pages && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <Button
                variant="outlined"
                onClick={handleLoadMore}
                disabled={loading}
              >
                Load More
              </Button>
            </Box>
          )}
        </>
      ) : (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No posts yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Be the first to share your aquarium experience!
          </Typography>
          <Button
            component={Link}
            to="/create"
            variant="contained"
            startIcon={<AddCircle />}
          >
            Create Your First Post
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default Home;

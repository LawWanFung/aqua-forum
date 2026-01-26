import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Chip,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Delete,
  Edit,
  People,
  Article,
  Photo,
  LocalOffer,
  Refresh,
  Dashboard,
  Add,
  VisibilityOff,
  Visibility,
  DragIndicator,
} from "@mui/icons-material";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import api from "../api";

// Sortable Table Row Component for Boards
function SortableTableRow({ board, onEdit, onToggle, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: board._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? "#f5f5f5" : "inherit",
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell
        sx={{ cursor: "grab", width: 50 }}
        {...attributes}
        {...listeners}
      >
        <DragIndicator sx={{ color: "text.secondary" }} />
      </TableCell>
      <TableCell>
        <Typography variant="h6">{board.icon}</Typography>
      </TableCell>
      <TableCell>
        <Typography fontWeight={500}>{board.name}</Typography>
        {board.description && (
          <Typography variant="caption" color="text.secondary">
            {board.description}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <code>{board.slug}</code>
      </TableCell>
      <TableCell>{board.postCount || 0}</TableCell>
      <TableCell>
        <Chip
          label={board.isActive ? "Active" : "Inactive"}
          size="small"
          color={board.isActive ? "success" : "default"}
        />
      </TableCell>
      <TableCell>
        <IconButton size="small" onClick={() => onEdit(board)}>
          <Edit fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onToggle(board)}
          color={board.isActive ? "warning" : "success"}
        >
          {board.isActive ? (
            <VisibilityOff fontSize="small" />
          ) : (
            <Visibility fontSize="small" />
          )}
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onDelete(board._id)}
          color="error"
        >
          <Delete fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

const AdminDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [boards, setBoards] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // User management
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ role: "", isActive: true });

  // Board management
  const [boardDialogOpen, setBoardDialogOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [boardForm, setBoardForm] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "📁",
    color: "#1976d2",
  });

  // Tag management
  const [tagSearch, setTagSearch] = useState("");
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagForm, setTagForm] = useState({
    name: "",
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      navigate("/");
      return;
    }
    fetchStats();
    fetchUsers();
    fetchPosts();
    fetchPhotos();
    fetchBoards();
    fetchTags();
  }, [isAuthenticated, user, navigate]);

  const fetchStats = async () => {
    try {
      const response = await api.get("/admin/stats");
      setStats(response.data.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = { limit: 50 };
      if (userSearch) params.search = userSearch;
      if (userRoleFilter) params.role = userRoleFilter;
      const response = await api.get("/admin/users", { params });
      setUsers(response.data.data.users);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await api.get("/admin/posts", { params: { limit: 50 } });
      setPosts(response.data.data.posts);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    }
  };

  const fetchPhotos = async () => {
    try {
      const response = await api.get("/admin/photos", {
        params: { limit: 50 },
      });
      setPhotos(response.data.data.photos);
    } catch (err) {
      console.error("Failed to fetch photos:", err);
    }
  };

  const fetchBoards = async () => {
    try {
      const response = await api.get("/boards/all");
      setBoards(response.data.data);
    } catch (err) {
      console.error("Failed to fetch boards:", err);
    }
  };

  const fetchTags = async () => {
    try {
      const params = { limit: 50 };
      if (tagSearch) params.search = tagSearch;
      const response = await api.get("/admin/tags", { params });
      setTags(response.data.data.tags);
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditForm({ role: user.role, isActive: user.isActive });
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      await api.put(`/admin/users/${selectedUser._id}`, editForm);
      setEditDialogOpen(false);
      fetchUsers();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to update user");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone.",
      )
    ) {
      try {
        await api.delete(`/admin/users/${userId}`);
        fetchUsers();
        fetchStats();
      } catch (err) {
        setError(err.response?.data?.error?.message || "Failed to delete user");
      }
    }
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await api.delete(`/admin/posts/${postId}`);
        fetchPosts();
        fetchStats();
      } catch (err) {
        setError(err.response?.data?.error?.message || "Failed to delete post");
      }
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (window.confirm("Are you sure you want to delete this photo?")) {
      try {
        await api.delete(`/admin/photos/${photoId}`);
        fetchPhotos();
        fetchStats();
      } catch (err) {
        setError(
          err.response?.data?.error?.message || "Failed to delete photo",
        );
      }
    }
  };

  // Board management functions
  const handleOpenBoardDialog = (board = null) => {
    if (board) {
      setEditingBoard(board);
      setBoardForm({
        name: board.name,
        slug: board.slug,
        description: board.description || "",
        icon: board.icon || "📁",
        color: board.color || "#1976d2",
      });
    } else {
      setEditingBoard(null);
      setBoardForm({
        name: "",
        slug: "",
        description: "",
        icon: "📁",
        color: "#1976d2",
      });
    }
    setBoardDialogOpen(true);
  };

  const handleSaveBoard = async () => {
    try {
      if (editingBoard) {
        await api.put(`/boards/${editingBoard._id}`, boardForm);
      } else {
        await api.post("/boards", boardForm);
      }
      setBoardDialogOpen(false);
      fetchBoards();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to save board");
    }
  };

  const handleToggleBoardActive = async (board) => {
    try {
      await api.put(`/boards/${board._id}/toggle`);
      fetchBoards();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to toggle board");
    }
  };

  const handleDeleteBoard = async (boardId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this board? Posts in this board will not be deleted.",
      )
    ) {
      try {
        await api.delete(`/boards/${boardId}`);
        fetchBoards();
      } catch (err) {
        setError(
          err.response?.data?.error?.message || "Failed to delete board",
        );
      }
    }
  };

  const handleInitBoards = async () => {
    try {
      await api.post("/boards/init");
      fetchBoards();
    } catch (err) {
      setError(
        err.response?.data?.error?.message || "Failed to initialize boards",
      );
    }
  };

  // Tag management functions
  const handleOpenTagDialog = (tag = null) => {
    if (tag) {
      setEditingTag(tag);
      setTagForm({
        name: tag.name,
      });
    } else {
      setEditingTag(null);
      setTagForm({
        name: "",
      });
    }
    setTagDialogOpen(true);
  };

  const handleSaveTag = async () => {
    try {
      if (editingTag) {
        await api.put(`/tags/${editingTag._id}`, tagForm);
      } else {
        await api.post("/tags", tagForm);
      }
      setTagDialogOpen(false);
      fetchTags();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to save tag");
    }
  };

  const handleDeleteTag = async (tagId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this tag? This will remove it from all posts.",
      )
    ) {
      try {
        await api.delete(`/admin/tags/${tagId}`);
        fetchTags();
        fetchStats();
      } catch (err) {
        setError(err.response?.data?.error?.message || "Failed to delete tag");
      }
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = boards.findIndex((board) => board._id === active.id);
      const newIndex = boards.findIndex((board) => board._id === over.id);

      const newBoards = arrayMove(boards, oldIndex, newIndex);
      setBoards(newBoards);

      // Save new order to backend
      try {
        const boardOrders = newBoards.map((board, index) => ({
          id: board._id,
          sortOrder: index,
        }));
        await api.put("/boards/reorder", { boardOrders });
      } catch (err) {
        console.error("Failed to save board order:", err);
        fetchBoards(); // Revert on error
      }
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "error";
      case "moderator":
        return "warning";
      default:
        return "default";
    }
  };

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Access denied. Admin privileges required.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
        Admin Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats && (
          <>
            <Grid item xs={6} sm={3}>
              <Card
                sx={{
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: "action.hover",
                    transform: "translateY(-2px)",
                  },
                }}
                onClick={() => setTabValue(0)}
              >
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <People sx={{ mr: 1, color: "primary.main" }} />
                    <Typography color="text.secondary" variant="body2">
                      Users
                    </Typography>
                  </Box>
                  <Typography variant="h4">{stats.users.total}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stats.users.active} active, {stats.users.newToday} new
                    today
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card
                sx={{
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: "action.hover",
                    transform: "translateY(-2px)",
                  },
                }}
                onClick={() => setTabValue(1)}
              >
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <Article sx={{ mr: 1, color: "secondary.main" }} />
                    <Typography color="text.secondary" variant="body2">
                      Posts
                    </Typography>
                  </Box>
                  <Typography variant="h4">{stats.posts}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card
                sx={{
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: "action.hover",
                    transform: "translateY(-2px)",
                  },
                }}
                onClick={() => setTabValue(2)}
              >
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <Photo sx={{ mr: 1, color: "success.main" }} />
                    <Typography color="text.secondary" variant="body2">
                      Photos
                    </Typography>
                  </Box>
                  <Typography variant="h4">{stats.photos}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card
                sx={{
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: "action.hover",
                    transform: "translateY(-2px)",
                  },
                }}
                onClick={() => setTabValue(3)}
              >
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <LocalOffer sx={{ mr: 1, color: "warning.main" }} />
                    <Typography color="text.secondary" variant="body2">
                      Tags
                    </Typography>
                  </Box>
                  <Typography variant="h4">{stats.tags}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant={isMobile ? "fullWidth" : "standard"}
        >
          <Tab label="Users" />
          <Tab label="Posts" />
          <Tab label="Photos" />
          <Tab label="Tags" />
          <Tab label="Boards" />
        </Tabs>
      </Paper>

      {/* Users Tab */}
      {tabValue === 0 && (
        <Paper>
          <Box sx={{ p: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              size="small"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && fetchUsers()}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={userRoleFilter}
                label="Role"
                onChange={(e) => setUserRoleFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="moderator">Moderator</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchUsers}
            >
              Refresh
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        size="small"
                        color={getRoleColor(user.role)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? "Active" : "Inactive"}
                        size="small"
                        color={user.isActive ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteUser(user._id)}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Posts Tab */}
      {tabValue === 1 && (
        <Paper>
          <Box sx={{ p: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchPosts}
            >
              Refresh
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Author</TableCell>
                  <TableCell>Views</TableCell>
                  <TableCell>Likes</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post._id}>
                    <TableCell sx={{ maxWidth: 300 }}>
                      <Typography
                        noWrap
                        component="div"
                        sx={{ fontWeight: 500 }}
                      >
                        {post.title}
                      </Typography>
                    </TableCell>
                    <TableCell>{post.user?.username || "Unknown"}</TableCell>
                    <TableCell>{post.metadata?.viewCount || 0}</TableCell>
                    <TableCell>{post.metadata?.likeCount || 0}</TableCell>
                    <TableCell>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/posts/${post._id}`)}
                      >
                        <Article fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeletePost(post._id)}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Photos Tab */}
      {tabValue === 2 && (
        <Paper>
          <Box sx={{ p: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchPhotos}
            >
              Refresh
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Photo</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Uploader</TableCell>
                  <TableCell>Likes</TableCell>
                  <TableCell>Uploaded</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {photos.map((photo) => (
                  <TableRow key={photo._id}>
                    <TableCell>
                      <Box
                        sx={{
                          width: 50,
                          height: 50,
                          borderRadius: 1,
                          overflow: "hidden",
                        }}
                      >
                        <img
                          src={photo.thumbnailUrl || photo.imageUrl}
                          alt={photo.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>{photo.title || "Untitled"}</TableCell>
                    <TableCell>{photo.user?.username || "Unknown"}</TableCell>
                    <TableCell>{photo.metadata?.likes || 0}</TableCell>
                    <TableCell>
                      {new Date(
                        photo.metadata?.uploadedAt || photo.createdAt,
                      ).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleDeletePhoto(photo._id)}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Tags Tab */}
      {tabValue === 3 && (
        <Paper>
          <Box sx={{ p: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenTagDialog()}
            >
              Add Tag
            </Button>
            <TextField
              size="small"
              placeholder="Search tags..."
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && fetchTags()}
            />
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchTags}
            >
              Refresh
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Usage Count</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tags.map((tag) => (
                  <TableRow key={tag._id}>
                    <TableCell>
                      <Typography fontWeight={500}>{tag.name}</Typography>
                    </TableCell>
                    <TableCell>{tag.usageCount}</TableCell>
                    <TableCell>
                      {new Date(tag.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenTagDialog(tag)}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteTag(tag._id)}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Boards Tab */}
      {tabValue === 4 && (
        <Paper>
          <Box sx={{ p: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenBoardDialog()}
            >
              Add Board
            </Button>
            <Button
              variant="outlined"
              startIcon={<Dashboard />}
              onClick={handleInitBoards}
            >
              Initialize Default Boards
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchBoards}
            >
              Refresh
            </Button>
          </Box>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 50 }}></TableCell>
                    <TableCell>Icon</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Slug</TableCell>
                    <TableCell>Posts</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <SortableContext
                  items={boards.map((b) => b._id)}
                  strategy={verticalListSortingStrategy}
                >
                  <TableBody>
                    {boards.map((board) => (
                      <SortableTableRow
                        key={board._id}
                        board={board}
                        onEdit={handleOpenBoardDialog}
                        onToggle={handleToggleBoardActive}
                        onDelete={handleDeleteBoard}
                      />
                    ))}
                  </TableBody>
                </SortableContext>
              </Table>
            </TableContainer>
          </DndContext>
        </Paper>
      )}

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={editForm.role}
                label="Role"
                onChange={(e) =>
                  setEditForm({ ...editForm, role: e.target.value })
                }
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="moderator">Moderator</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editForm.isActive}
                label="Status"
                onChange={(e) =>
                  setEditForm({ ...editForm, isActive: e.target.value })
                }
              >
                <MenuItem value={true}>Active</MenuItem>
                <MenuItem value={false}>Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUser}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Board Dialog */}
      <Dialog
        open={boardDialogOpen}
        onClose={() => setBoardDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingBoard ? "Edit Board" : "Create New Board"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Board Name"
              value={boardForm.name}
              onChange={(e) =>
                setBoardForm({ ...boardForm, name: e.target.value })
              }
              fullWidth
              required
            />
            <TextField
              label="Slug"
              value={boardForm.slug}
              onChange={(e) =>
                setBoardForm({ ...boardForm, slug: e.target.value })
              }
              fullWidth
              required
              helperText="URL-friendly identifier (e.g., fish, shrimp, plant)"
            />
            <TextField
              label="Description"
              value={boardForm.description}
              onChange={(e) =>
                setBoardForm({ ...boardForm, description: e.target.value })
              }
              fullWidth
              multiline
              rows={2}
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Icon"
                value={boardForm.icon}
                onChange={(e) =>
                  setBoardForm({ ...boardForm, icon: e.target.value })
                }
                sx={{ width: 100 }}
              />
              <TextField
                label="Color"
                type="color"
                value={boardForm.color}
                onChange={(e) =>
                  setBoardForm({ ...boardForm, color: e.target.value })
                }
                sx={{ width: 100 }}
                InputProps={{ sx: { height: 40 } }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBoardDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveBoard}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog
        open={tagDialogOpen}
        onClose={() => setTagDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingTag ? "Edit Tag" : "Create New Tag"}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Tag Name"
              value={tagForm.name}
              onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
              fullWidth
              required
              helperText="2-50 characters, will be converted to lowercase"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTag}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard;

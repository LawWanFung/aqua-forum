import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Menu,
  MenuItem,
  Avatar,
  Container,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  DarkMode,
  LightMode,
  Menu as MenuIcon,
  Home,
  PhotoCamera,
  Person,
  AddCircle,
  Logout,
  Login,
} from "@mui/icons-material";
import { logout } from "../slices/authSlice";
import NotificationPanel from "./NotificationPanel";

const Header = ({ darkMode, toggleDarkMode, user }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    handleMenuClose();
    navigate("/");
  };

  const menuItems = [
    { text: "Home", icon: <Home />, path: "/" },
    { text: "Gallery", icon: <PhotoCamera />, path: "/gallery" },
  ];

  const authMenuItems = [
    { text: "Create Post", icon: <AddCircle />, path: "/create" },
    {
      text: "Profile",
      icon: <Person />,
      path: user ? `/profile/${user._id}` : "/",
    },
  ];

  const adminMenuItems = [
    {
      text: "Admin Dashboard",
      icon: <Person />,
      path: "/admin",
    },
  ];

  const drawer = (
    <Box sx={{ width: 250 }}>
      <Toolbar />
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            component={Link}
            to={item.path}
            onClick={handleDrawerToggle}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
        {isAuthenticated &&
          authMenuItems.map((item) => (
            <ListItem
              button
              key={item.text}
              component={Link}
              to={item.path}
              onClick={handleDrawerToggle}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
      </List>
    </Box>
  );

  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            variant="h5"
            component={Link}
            to="/"
            sx={{
              fontWeight: 700,
              color: "primary.main",
              textDecoration: "none",
              flexGrow: isMobile ? 1 : 0,
              mr: 4,
            }}
          >
            Aqua Forum 🐠
          </Typography>

          {!isMobile && (
            <Box sx={{ display: "flex", gap: 1, mr: 2 }}>
              <Button component={Link} to="/" color="inherit">
                Home
              </Button>
              <Button component={Link} to="/gallery" color="inherit">
                Gallery
              </Button>
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          <IconButton onClick={toggleDarkMode} color="inherit" sx={{ mr: 1 }}>
            {darkMode ? <LightMode /> : <DarkMode />}
          </IconButton>

          {!isMobile && (
            <>
              {isAuthenticated ? (
                <>
                  <Button
                    component={Link}
                    to="/create"
                    variant="contained"
                    color="primary"
                    startIcon={<AddCircle />}
                    sx={{ mr: 1 }}
                  >
                    New Post
                  </Button>
                  <NotificationPanel />
                  <IconButton onClick={handleMenuOpen}>
                    <Avatar src={user?.profile?.avatar} alt={user?.username}>
                      {user?.username?.charAt(0).toUpperCase()}
                    </Avatar>
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "right" }}
                  >
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary">
                        {user?.username}
                      </Typography>
                    </MenuItem>
                    <Divider />
                    <MenuItem
                      component={Link}
                      to={`/profile/${user?._id}`}
                      onClick={handleMenuClose}
                    >
                      <ListItemIcon>
                        <Person fontSize="small" />
                      </ListItemIcon>
                      Profile
                    </MenuItem>
                    {user?.isAdmin && (
                      <MenuItem
                        component={Link}
                        to="/admin"
                        onClick={handleMenuClose}
                      >
                        <ListItemIcon>
                          <Person fontSize="small" />
                        </ListItemIcon>
                        Admin Dashboard
                      </MenuItem>
                    )}
                    <MenuItem onClick={handleLogout}>
                      <ListItemIcon>
                        <Logout fontSize="small" />
                      </ListItemIcon>
                      Logout
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button component={Link} to="/login" color="inherit">
                    Login
                  </Button>
                  <Button
                    component={Link}
                    to="/register"
                    variant="contained"
                    color="primary"
                  >
                    Sign Up
                  </Button>
                </Box>
              )}
            </>
          )}

          {isMobile && isAuthenticated && (
            <IconButton onClick={handleMenuOpen}>
              <Avatar src={user?.profile?.avatar} alt={user?.username}>
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          )}
        </Toolbar>
      </Container>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: 250 },
        }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
};

export default Header;

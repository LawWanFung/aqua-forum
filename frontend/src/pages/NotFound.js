import React from "react";
import { Link } from "react-router-dom";
import { Container, Typography, Box, Button } from "@mui/material";
import { Home, SearchOff } from "@mui/icons-material";

const NotFound = () => {
  return (
    <Container maxWidth="md" sx={{ py: 8, textAlign: "center" }}>
      <SearchOff sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
      <Typography variant="h2" component="h1" gutterBottom fontWeight={700}>
        404
      </Typography>
      <Typography variant="h5" component="h2" gutterBottom>
        Page Not Found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Oops! The page you're looking for doesn't exist or has been moved.
      </Typography>
      <Button
        component={Link}
        to="/"
        variant="contained"
        size="large"
        startIcon={<Home />}
      >
        Back to Home
      </Button>
    </Container>
  );
};

export default NotFound;

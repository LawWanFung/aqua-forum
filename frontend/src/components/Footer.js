import React from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Link as MuiLink,
  IconButton,
} from "@mui/material";
import { GitHub, Twitter } from "@mui/icons-material";

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: "auto",
        backgroundColor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Aqua Forum. Built with ❤️ for aquarium
            enthusiasts.
          </Typography>

          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <MuiLink
              component={Link}
              to="/about"
              color="text.secondary"
              underline="hover"
            >
              About
            </MuiLink>
            <MuiLink
              component={Link}
              to="/privacy"
              color="text.secondary"
              underline="hover"
            >
              Privacy
            </MuiLink>
            <MuiLink
              component={Link}
              to="/terms"
              color="text.secondary"
              underline="hover"
            >
              Terms
            </MuiLink>

            <Box sx={{ display: "flex", gap: 0.5 }}>
              <IconButton size="small" color="inherit" aria-label="github">
                <GitHub fontSize="small" />
              </IconButton>
              <IconButton size="small" color="inherit" aria-label="twitter">
                <Twitter fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;

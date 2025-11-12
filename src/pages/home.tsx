import { Box, Typography } from "@mui/material";

const HomePage = () => {
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4">RV Verge</Typography>
      <Typography variant="body1" sx={{ marginTop: 2 }}>
        Clash Verge Rev - Lightweight version for RISC-V devices
      </Typography>
      <Typography variant="body2" sx={{ marginTop: 2, color: "text.secondary" }}>
        This is a minimal version to test if the application can run on RISC-V devices.
      </Typography>
    </Box>
  );
};

export default HomePage;


import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import ControlPage from './ControlPage';
import GraphPage from './GraphPage';

function App() {
  return (
    <Router>
      {/* Navigation Bar */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" style={{ flexGrow: 1 }}>
            Water Monitoring Dashboard
          </Typography>
          <Button color="inherit" component={Link} to="/">
            Control Panel
          </Button>
          <Button color="inherit" component={Link} to="/graph">
            Graphs
          </Button>
        </Toolbar>
      </AppBar>

      {/* Page Content */}
      <Container style={{ marginTop: '20px' }}>
        <Routes>
          <Route path="/" element={<ControlPage />} />
          <Route path="/graph" element={<GraphPage />} />
        </Routes>
      </Container>
    </Router>
  );
}

export default App;
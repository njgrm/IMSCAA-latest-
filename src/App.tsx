// Description: This is the main entry point of the application. It sets up the routing for the application using React Router.
// Test comment to verify edit_file tool is working
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Landing from './landing';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import Dashboard from './Dashboard';
import Crud from './crud';
import Requirements from './Requirements';
import Transactions from './Transactions';
import TransactionReport from './TransactionReport';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/landing" element={<Landing />} />

        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/members" element={<Crud />} />
        <Route path="/requirements" element={<Requirements />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/reports/transaction-report" element={<TransactionReport />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
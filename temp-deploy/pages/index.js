import React from 'react';

export default function Home() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>Say Fluent</h1>
      <p style={{ color: '#666', maxWidth: '600px', textAlign: 'center' }}>
        Welcome to Say Fluent - Your language learning companion. This is a minimal deployment to verify that the application can be deployed to Vercel.
      </p>
    </div>
  );
} 
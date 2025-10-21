import React, { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App(){
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));

  function onAuth(data){
    if(data.token) localStorage.setItem('token', data.token);
    if(data.user) localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }

  if(!token || !user) return <Login onAuth={onAuth} />;

  return <Dashboard token={token} user={user} />;
}

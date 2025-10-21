import React, { useState } from 'react';
import axios from 'axios';
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Login({ onAuth }){
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function signup(){
    const res = await axios.post(API + '/auth/signup', { email, username, password, displayName: username || email });
    onAuth({ token: res.data.token, user: res.data.user });
  }
  async function login(){
    const res = await axios.post(API + '/auth/login', { username, email, password });
    onAuth({ token: res.data.token, user: res.data.user });
  }

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h2>Loopify — Login / Signup</h2>
        <input placeholder="username (for admin use bskumar099)" value={username} onChange={e=>setUsername(e.target.value)} />
        <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="password" value={password} onChange={e=>setPassword(e.target.value)} type="password" />
        <div className="row">
          <button onClick={signup} className="btn">Signup</button>
          <button onClick={login} className="btn muted">Login</button>
        </div>
      </div>
    </div>
  );
}

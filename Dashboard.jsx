import React, { useEffect, useState } from 'react';
import axios from 'axios';
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Dashboard({ token, user }){
  const [url, setUrl] = useState('');
  const [type, setType] = useState('website');
  const [current, setCurrent] = useState(null);
  const [timer, setTimer] = useState(0);

  async function upload(){
    try{
      const res = await axios.post(API + '/links', { url, type }, { headers: { Authorization: 'Bearer '+localStorage.getItem('token') } });
      alert('Uploaded');
      setUrl('');
    }catch(e){ console.error(e); alert('Upload failed'); }
  }

  async function start(){
    try{
      const res = await axios.get(API + '/links/next', { headers: { Authorization: 'Bearer '+localStorage.getItem('token') } });
      setCurrent(res.data.link);
      setTimer(300);
    }catch(e){ console.error(e); }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <h1>Loopify</h1>
        </div>
      </header>
      <main className="grid">
        <section className="left">
          <div className="card">
            <h3>Upload Link</h3>
            <input placeholder="https://example.com/..." value={url} onChange={e=>setUrl(e.target.value)} />
            <select value={type} onChange={e=>setType(e.target.value)}>
              <option value="youtube">YouTube</option>
              <option value="website">Website</option>
              <option value="product">Product</option>
            </select>
            <button className="btn" onClick={upload}>Upload</button>
          </div>
          <div className="card">
            <h3>Auto Player</h3>
            <div className="row">
              <button className="btn" onClick={start}>Start</button>
            </div>
            {current ? (
              <div style={{marginTop:10}}>
                <p>Now playing: <a href={current.url} target="_blank" rel="noreferrer">{current.url}</a></p>
                {current.type === 'youtube' && (
                  <iframe title="yt" width="560" height="315" src={`https://www.youtube.com/embed/${parseYouTubeId(current.url)}`} allowFullScreen />
                )}
                <p>Next in: {Math.floor(timer/60)}:{('0'+(timer%60)).slice(-2)}</p>
              </div>
            ) : <p>No link queued yet.</p>}
          </div>
        </section>
        <aside className="right">
          <div className="card">
            <h3>Admin / Info</h3>
            <p>Logged in as: {user?.username || user?.email}</p>
            <p>Role: {user?.role}</p>
          </div>
        </aside>
      </main>
    </div>
  );
}

function parseYouTubeId(url){
  try{
    const m = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/(.+)$/);
    return m ? m[1] : url.split('/').pop();
  }catch(e){ return ''; }
}

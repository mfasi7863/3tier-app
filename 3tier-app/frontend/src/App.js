import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function App() {
    const [users, setUsers] = useState([]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            const [usersRes, healthRes] = await Promise.all([
                fetch(`${API_URL}/api/users`),
                fetch(`${API_URL}/api/health`)
            ]);
            const usersData = await usersRes.json();
            const healthData = await healthRes.json();
            if (usersData.success) setUsers(usersData.data);
            setHealth(healthData);
            setError(null);
        } catch (err) {
            setError('Failed to connect to backend API. Make sure the backend is running.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !email) { alert('Please fill in all fields'); return; }
        try {
            const response = await fetch(`${API_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email }),
            });
            const data = await response.json();
            if (data.success) {
                setName(''); setEmail('');
                fetchData();
                alert('User added successfully!');
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            alert('Failed to add user');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            const response = await fetch(`${API_URL}/api/users/${id}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) { fetchData(); alert('User deleted successfully!'); }
            else alert(`Error: ${data.error}`);
        } catch (err) {
            alert('Failed to delete user');
        }
    };

    if (loading) {
        return <div className="App"><div className="loading">Loading...</div></div>;
    }

    return (
        <div className="App">
            <header className="App-header">
                <h1>🚀 3-Tier EC2 App</h1>
                <p>React + Node.js + MySQL on AWS EC2</p>
            </header>

            <div className="container">
                <div className="health-status">
                    <h2>System Health</h2>
                    {health ? (
                        <div className={`status ${health.status}`}>
                            <strong>Backend:</strong> {health.status === 'healthy' ? '✅ Healthy' : '❌ Unhealthy'}<br />
                            <strong>Database:</strong> {health.database === 'connected' ? '✅ Connected' : '❌ Disconnected'}<br />
                            <small>Last check: {new Date(health.timestamp).toLocaleString()}</small>
                        </div>
                    ) : (
                        <div className="status error">❌ Unable to reach backend</div>
                    )}
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="form-section">
                    <h2>Add New User</h2>
                    <form onSubmit={handleSubmit}>
                        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <button type="submit">Add User</button>
                    </form>
                </div>

                <div className="users-section">
                    <h2>Users ({users.length})</h2>
                    {users.length === 0 ? (
                        <p className="no-users">No users found. Add one above!</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th><th>Name</th><th>Email</th><th>Created At</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td>{user.id}</td>
                                        <td>{user.name}</td>
                                        <td>{user.email}</td>
                                        <td>{new Date(user.created_at).toLocaleString()}</td>
                                        <td>
                                            <button className="delete-btn" onClick={() => handleDelete(user.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <footer className="App-footer">
                <p>Deployed on AWS EC2 — us-east-1</p>
            </footer>
        </div>
    );
}

export default App;
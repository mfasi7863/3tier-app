const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const app = express();
const PORT = process.env.PORT || 3000;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const SECRET_NAME = process.env.SECRET_NAME || '3tier-app/db-credentials';

app.use(cors());
app.use(express.json());

async function getDBCredentials() {
    if (process.env.USE_ENV_SECRETS === 'true') {
        console.log('ℹ️  Using environment variable secrets (local mode)');
        return {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'appuser',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'myapp',
            port: process.env.DB_PORT || 3306,
        };
    }

    try {
        const client = new SecretsManagerClient({ region: AWS_REGION });
        const command = new GetSecretValueCommand({ SecretId: SECRET_NAME });
        const response = await client.send(command);
        const secret = JSON.parse(response.SecretString);

        console.log('✅ Secrets fetched from AWS Secrets Manager');
        return {
            host: process.env.DB_HOST || 'mysql',
            user: secret.MYSQL_USER,
            password: secret.MYSQL_PASSWORD,
            database: secret.MYSQL_DATABASE,
            port: parseInt(process.env.DB_PORT) || 3306,
        };
    } catch (error) {
        console.error('❌ Failed to fetch secrets from AWS Secrets Manager:', error.message);
        process.exit(1);
    }
}

async function bootstrap() {
    const dbConfig = await getDBCredentials();

    const pool = mysql.createPool({
        ...dbConfig,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    });

    async function testDBConnection() {
        try {
            const conn = await pool.getConnection();
            console.log('✅ Database connected successfully');
            conn.release();
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
        }
    }

    async function initDB() {
        try {
            const conn = await pool.getConnection();
            await conn.query(`
        CREATE TABLE IF NOT EXISTS users (
          id         INT AUTO_INCREMENT PRIMARY KEY,
          name       VARCHAR(100) NOT NULL,
          email      VARCHAR(100) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
            console.log('✅ Database initialized');
            conn.release();
        } catch (error) {
            console.error('❌ Database init failed:', error.message);
        }
    }

    app.get('/api/health', async (req, res) => {
        try {
            await pool.query('SELECT 1');
            res.json({
                status: 'healthy',
                database: 'connected',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            res.status(500).json({
                status: 'unhealthy',
                database: 'disconnected',
                error: error.message,
            });
        }
    });

    app.get('/api/users', async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/users', async (req, res) => {
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ success: false, error: 'Name and email are required' });
        }
        try {
            const [result] = await pool.query(
                'INSERT INTO users (name, email) VALUES (?, ?)',
                [name, email]
            );
            res.status(201).json({ success: true, message: 'User created', userId: result.insertId });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                res.status(400).json({ success: false, error: 'Email already exists' });
            } else {
                res.status(500).json({ success: false, error: error.message });
            }
        }
    });

    app.delete('/api/users/:id', async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            res.json({ success: true, message: 'User deleted' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.listen(PORT, '0.0.0.0', async () => {
        console.log(`🚀 Server running on port ${PORT}`);
        await testDBConnection();
        await initDB();
    });
}

bootstrap();
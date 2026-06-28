const http = require('http');
const { deleteUser } = require('./utils/dbDeleteUser');
require('dotenv').config();

const PORT = 3001;

// Helper para obter o corpo da requisição de forma assíncrona
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/delete-user' && (req.method === 'POST' || req.method === 'GET')) {
    let userEmail = process.env.EMAIL;

    // Se for POST, tenta ler o e-mail do corpo da requisição
    if (req.method === 'POST') {
      try {
        const bodyStr = await getRequestBody(req);
        if (bodyStr) {
          const body = JSON.parse(bodyStr);
          if (body.email) {
            userEmail = body.email;
          }
        }
      } catch (err) {
        console.warn('[Helper Server]: Erro ao parsear o body da requisição, usando e-mail do .env.', err.message);
      }
    }

    if (!userEmail) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'EMAIL env variable not defined in .env and no email provided in body' }));
      return;
    }

    try {
      console.log(`[Helper Server]: Solicitando exclusão do usuário ${userEmail}...`);
      const result = await deleteUser(userEmail);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: `User ${userEmail} processed`, result }));
    } catch (err) {
      console.error('[Helper Server]: Erro ao deletar usuário:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', details: err.message }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Route not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`[Helper Server] Rodando localmente na porta ${PORT} para apoiar os testes do Maestro.`);
});

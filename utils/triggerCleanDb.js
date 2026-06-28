// Esse script roda dentro do ambiente JS do Maestro no host.
// Ele faz uma requisição HTTP para o nosso server.js local limpar o banco de dados.
try {
  var response = http.post('http://localhost:3001/delete-user', {
    headers: {
      'Content-Type': 'application/json'
    },
    body: '{}'
  });

  if (response.status !== 200) {
    throw new Error('O servidor de ajuda retornou status ' + response.status + ': ' + response.body);
  }
  
  console.log('Usuário deletado do banco com sucesso antes do teste: ' + response.body);
} catch (error) {
  throw new Error('Falha ao limpar o banco de dados: ' + error.message);
}

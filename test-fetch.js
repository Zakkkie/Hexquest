import http from 'http';

http.get('http://localhost:3000/images/I_C_Banana.png', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', (e) => {
  console.error(e);
});

import https from 'https';

https.get('https://ais-dev-nzh6vzkj2qggmddigxvrfo-43428115505.us-west2.run.app/images/I_C_Banana.png', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', (e) => {
  console.error(e);
});

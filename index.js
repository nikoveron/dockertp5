
const express = require('express');
const { exec } = require('child_process');
const path = require('path')
const Docker = require('dockerode'); 
const fs = require('fs');
const childProcessExec = require('child_process').exec;

const app = express();
const port = 16000;
const docker = new Docker();
app.use(express.static(path.join(__dirname, '/public')));

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
//*************************************************************************************/
// var contenedor = 1
var puerto = 7000
var ultimoContenedor = 0

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.post('/dock', (req, res) => {
    ultimoContenedor++
    const nombreContenedor = `contenedor${ultimoContenedor}`;
    let comando = `docker run -t -d -p ${puerto}:80 --name ${nombreContenedor} php:apache-bullseye`;

  exec(comando, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error al ejecutar el comando: ${error}`);
      res.status(500).send('Error interno del servidor');
      return;
    }
    console.log(`Resultado:\n${stdout}`);
    
    console.log(`Contenedor actual: a${nombreContenedor} usando el puerto ${puerto}`);
        
    // Aumenta el valor de contenedor para el próximo contenedor
    puerto++
    console.log(nombreContenedor,puerto)
    res.status(200).send(`Contenedor Docker a${nombreContenedor} CREADO con éxito`);
  });
});

app.delete('/dock', (req,res)=>{
  if (ultimoContenedor>0) {
    const nombreContenedor = `contenedor${ultimoContenedor}`
    const comando = `docker rm -f ${nombreContenedor}`
  
    exec(comando, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error al ejecutar el comando: ${error}`);
        res.status(500).send('Error interno del servidor');
        return;
      }
      console.log(`Resultado:\n${stdout}`);
      res.status(200).send('Contenedor Docker ELIMINADO con éxito');
    });
    ultimoContenedor--
  }else{
    res.status(404).send('No hay contenedor para eliminar')
  }
})
// Nueva función para obtener la dirección IP del contenedor
app.get('/getContainerIP/:containerName', (req, res) => {
  const containerName = req.params.containerName;

  docker.getContainer(containerName).inspect((err, containerInfo) => {
      if (err) {
          console.error(`Error al obtener información del contenedor: ${err}`);
          res.status(500).send('Error interno del servidor');
      } else {
          const ipAddress = containerInfo.NetworkSettings.IPAddress;
          res.status(200).json({ ipAddress });
      }
  });
});

function agregarIPABalanceador(ipAddress) {
  // Ruta al archivo de configuración de Nginx
  const nginxConfigFile = '/etc/nginx/nginx.conf'; // Cambia la ruta según tu configuración

  // Contenido a agregar al archivo de configuración
  const nuevoBloque = `
    server {
      listen 80;
      server_name ${ipAddress};
      location / {
        proxy_pass http://${ipAddress}:80; // Reemplaza con tu configuración de proxy inverso
      }
    }
  `;

  // Agregar el nuevo bloque al archivo de configuración de Nginx
  fs.appendFile(nginxConfigFile, nuevoBloque, (err) => {
    if (err) {
      console.error(`Error al agregar la IP al archivo de configuración: ${err}`);
    } else {
      console.log(`IP ${ipAddress} agregada al archivo de configuración de Nginx.`);
      // Recargar la configuración de Nginx para aplicar los cambios
      ejecutarComandoDeShell('nginx -s reload');
    }
  });
}

function ejecutarComandoDeShell(comando) {
  exec(comando, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error al ejecutar el comando: ${error}`);
    } else {
      console.log(`Resultado del comando:\n${stdout}`);
    }
  });
}


const {models} = require('./model');
const {colorize, log, biglog, errorlog} = require("./out");
const Sequelize = require('sequelize');


exports.helpCmd = (socket,rl) => {
      log(socket,"Comandos:");
      log(socket,"  h|help - Muestra esta ayuda.");
      log(socket,"  list - Listar los quizzes existentes.");
      log(socket,"  show <id> - Muestra la pregunta y la respuesta del quiz indicado.");
      log(socket,"  add - Añadir un nuevo quiz");
      log(socket,"  delete <id> - Borra el quiz indicado");
      log(socket,"  edit <id> - Edita el quiz indicado");
      log(socket,"  test <id> - Probar el quiz indicado");
      log(socket,"  p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
      log(socket,"  credits - Créditos.");
      log(socket,"  q|quit - Salir del programa.");
      rl.prompt();
};

exports.listCmd = (socket,rl) =>{

  models.quiz.findAll()
  .each(quiz => {
        log(socket,` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
    })
    .catch(error => {
      errorlog(socket,error.message);
    })
    .then(() => {
    rl.prompt();
    });
};

/* creamos una promesa
* esta funcion devuelve una promesa que:
* valida que se ha introducido un valor para el parametro 
*convierte el parametro en un numero entero
* si todo va bien, la promesa se satisface y devuelve el valor de id a usar.
**/
const validateId =(socket, id) =>{
  return new Sequelize.Promise((resolve,reject)=>{
    if (typeof id === "undefined"){
      reject(new Error(`Falta el parametro <id>.`));
    }else{
      id = parseInt(id); // coger la parte entera y descartar lo demas
      if( Number.isNaN(id)){
        reject(new Error(`El valor del parametro <id< no es un número`));
      }else{
        resolve(id);
      }
    }
  });
};

exports.showCmd = (socket,rl, id) => {
  validateId(id,socket) //esto me devuelve una promesa
  .then(id => models.quiz.findById(id))
  .then(quiz => {
    if (!quiz){
      throw new Error(`No existe un quiz asociado al id =${id}.`);
    }
    log(socket,`[${colorize(id, 'magenta')}]: ${quiz.question} ${colorize('=>' , 'blue')} ${quiz.answer}`);
  })
  .catch(error =>{
    errorlog(socket,error.message);
  })
  .then(() =>{
    rl.prompt();
  });
};
/**
*Esta funcion convierta la llamada rl.question, que esta basada en callbacks, en una basada en promesas
*esta funcion devulve una promesa que cuando se cumple, proporciona el texto introducido
*entonces la llamada a then que hay que hacer la promesa devuelta sera:
*.then(answer=> {...})
*tambien colorea en rojo e texto de la pregunta, elimina espacios al principio y 
* lepasamos como parametro rl y text ( pregunta que hay que hacerle al usuario)
*/
const makeQuestion = (rl,text) => {
  return new Sequelize.Promise((resolve,reject) => {
    rl.question(colorize(text,'blue'),answer =>{
      resolve(answer.trim());
    });
  });
};

exports.addCmd = (socket,rl) => {
  makeQuestion(rl, 'Introduzca una pregunta: ')
    .then(q => {
        return makeQuestion(rl, 'Introduzca la respuesta: ')
        .then(a => {
            return {question: q, answer: a};
        });
    })
    .then(quiz => {
        return models.quiz.create(quiz);
    })
    .then((quiz) => {
        log(socket,` ${colorize('Se ha añadido.', 'blue')}: ${quiz.question} ${colorize('=>', 'blue')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog(socket,'El quiz es erróneo.');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(socket,error.message);
    })
    .then(() => {
        rl.prompt();
  });   
};
    


exports.deleteCmd =(socket,rl,id)=>{
  validateId(id,socket)
    .then(id => models.quiz.destroy({where: {id}}))
    .catch(error => {
      errorlog(socket,error.message);
    })
    .then(() => {
      rl.prompt();
  });
};
exports.editCmd =(socket,rl, id)=>{
  validateId(id,socket)
  .then(id => models.quiz.findById(id))
  .then(quiz => {
    if(!quiz){
      throw new Error(`No existe un quiz asociado al id=${id}.`);
    }

    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
    return makeQuestion(rl, 'Introduzca la pregunta: ')
    .then(q => {
      process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
      return makeQuestion(rl, 'Introduzca la respuesta: ')
      .then(a => {
        quiz.question = q;
        quiz.answer = a;
        return quiz;
      });
    });
  })
  .then(quiz => {
    return quiz.save();
  })
  .then(quiz => {
    log(socket,` Se ha cambiado el quiz ${colorize(id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
  })
  .catch(Sequelize.ValidationError, error => {
    errorlog(socket,'El quiz es erroneo:');
    error.errors.forEach(({message}) => errorlog(message));
  })
  .catch(error => {
    errorlog(socket,error.message);
  })
  .then(() =>{
     rl.prompt();
}); 
  
};



exports.testCmd = (socket,rl, id) => {
     validateId(socket,id)
           .then(id => models.quiz.findById(id))
           .then(quiz => {
                if(!quiz){
                    throw new Error(`No existe un quiz asociado al id=${id}.`);
                }
                makeQuestion(rl,quiz.question)
                .then(answer => {
                  if(answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim()){
  			         log(socket,'Su respuesta es correcta.','black');
                     biglog(socket,"CORRECTA", 'green');
                     rl.prompt();
  				    
                  }else{
                     log(socket,'Su respuesta es incorrecta.','black');
                     biglog(socket,"INCORRECTA", 'red');
                     rl.prompt();
  			      }
  		        });
             })
         .catch(Sequelize.ValidationError, error => {
         	errorlog(socket,'El quiz es erroneo:');
         	error.errors.forEach(({message}) => errorlog(message));
         })
        .catch(error => {
            errorlog(socket,error.message);
        })
        .then(() =>{
            rl.prompt();
        }); 
           
};

exports.playCmd = (socket,rl) => {

  		let puntuacion = 0; 
  		let preguntas = []; 

  		const playOne = () => {
        return new Promise ((resolve, reject) => {
  				if(preguntas.length === 0) {
            log(socket,' No hay más preguntas','blue');
            log(socket,' Fin del juego. Aciertos: ');
  					resolve();
  					return;
  				}
  				let pos = Math.floor(Math.random()*preguntas.length);
  				let quiz = preguntas[pos];
  		    preguntas.splice(pos, 1); //lo borro porque ya no lo quiero más

  		    makeQuestion(rl, quiz.question)
  		    .then(answer => {
            if(answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim()){
              puntuacion++;
  				    log(socket,`  CORRECTO - Lleva ${puntuacion} aciertos`);
  				    resolve(playOne());
            }else{
              log(socket,'  INCORRECTO ');
              log(socket,`  Fin del juego. Aciertos: ${puntuacion} `);
  				    resolve();
  			    }
  		    })
  	     })
  	  }
  		models.quiz.findAll({raw: true}) //el raw hace que enseñe un string solamente en lugar de todo el contenido
  		.then(quizzes => {
  			preguntas= quizzes;
      })
  		.then(() => {
  		 	return playOne(); //es necesario esperar a que la promesa acabe, por eso no es un return a secas
  		 })
  		.catch(e => {
  			errorlog(socket,"Error:" + e); //usar errorlog con colores
  		})
  		.then(() => {
  			biglog(socket,puntuacion, 'green');
  			rl.prompt();
  		})
};
exports.creditsCmd = (socket,rl) => {
      log('Autores de la práctica:', 'magenta');
      log('anagonzalezb', 'magenta');
      log('albadelgadof', 'magenta');
      rl.prompt();
};

exports.quitCmd =(socket, rl) => {
     rl.close();
     socket.end();
};

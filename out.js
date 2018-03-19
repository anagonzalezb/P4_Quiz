
const figlet =require('figlet');
const chalk = require('chalk');



/** Para dar color 
 */
colorize = (msg, color) => {
  if (typeof color !== "undefined"){
    msg = chalk[color].bold(msg);
  }
  return msg;
};

/** escribir mensaje
 */
log =(socket,msg, color) => {
  socket.write(colorize(msg,color)+ "\n");
};

biglog =(socket,msg, color) => {
  log(socket,figlet.textSync(msg,{horizontalLayaut: 'full'}), color);
};

errorlog =(socket,emsg) => {
  log(socket,`${colorize("Error", "red")}: ${colorize(colorize(emsg, "red"), "bgYellowBright")}\n`);
};

exports = module.exports = {colorize, log, biglog, errorlog};
  


// importacoes
const env = require("./.env");
const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const request = require("request");

// inicializando o bot
const bot = new Telegraf(env.token);

// funcao para verificar se o usuario esta na lista de permissoes
function isAllowed(ctx) {
  var from = ctx.update.message.from;
  // whitelist recebe lista de usuarios de .env
  var whitelist = env.whitelist;
  var isAllowed = false;
  whitelist.forEach((userItem) => {
    if (from.id == userItem) {
      isAllowed = true;
    }
  });
  return isAllowed;
}

// Inicio da conversa
bot.start(async (ctx) => {
  if (isAllowed(ctx)) {
    // objeto do usuario que enviou a mensagem
    const from = ctx.update.message.from;
    // retorno de mensagem
    await ctx.reply(`Ola ${from.first_name}!
        As minhas funcionalidades sao as seguintes:
            * Tenho algumas interacoes basicas
            * Informo o endereço e localizacao aproximada utilizando um CEP
        Respondo a seguintes interacoes:
            * Mensagens simples
            * Mensagem de audio
            * Imagem
            * Localizacoes
            * Contatos
            * Figurinhas
        
        Vamos começar? envie o seu CEP que vou tentar informar a sua localização.
        `);
  } else {
    // retorno para usuario nao autorizado
    ctx.reply(`você não esta autorizado a utilizar esta funcionalidade.`);
  }
});

bot.on("text", (ctx, next) => {
  // verifica se usuario esta autorizado
  if (isAllowed(ctx)) {
    const texto = ctx.update.message.text;
    // separa o cep de outros elementos em uma string enviada pelo usuario
    var cep = texto.replace(/[^0-9]/g, "");
    if (cep.length == 8) {
      // requisicao de api pegar o endereço
      request(`${env.apiViaCepUrl}/${cep}/json/`, async (err, res, body) => {
        var response = JSON.parse(body);
        if (!response.erro) {
          // Informa o endereco
          await ctx.replyWithMarkdownV2(
            `O CEP informado foi *${cep}*\\
    
                        Rua: ${response.logradouro}
                        Bairro: ${response.bairro}
                        Cidade: ${response.localidade}
                        Estado: ${response.uf}
                        `
          );
          var query = require("querystring").escape(
            `${response.logradouro} ${response.bairro} ${response.localidade} ${response.uf}`
          );
          // faz a requisicao da longitude e latitude do endereco da primeira requisicao por meio de uma API
          request(
            `${env.apiPositionStackUrl}&query=${query}`,
            async (err, res, bodyLatLon) => {
              var responseLatLon = JSON.parse(bodyLatLon);
              lat = JSON.stringify(responseLatLon.data[0].latitude);
              lon = JSON.stringify(responseLatLon.data[0].longitude);
              await ctx.replyWithHTML(
                `<b>Localizacao aproximada para este endereco:</b>`
              );
              // retorna com uma localizacao, informando a latitude e longitude
              await ctx.replyWithLocation(lat, lon);
            }
          );
        } else {
          // CEP nao e valido
          await ctx.reply("CEP invalido");
        }
      });
    } else {
      next();
    }
  } else {
    // usuario nao autorizado
    ctx.reply(`você não esta autorizado a utilizar esta funcionalidade.`);
  }
});

// para resposta padrao
bot.on("text", (ctx, next) => {
  if (isAllowed(ctx)) {
    ctx.reply(`Nao entendi a sua solicitacao.`);
  } else {
    // usuario nao autorizado
    ctx.reply(`você não esta autorizado a utilizar esta funcionalidade.`);
  }
});

// ao usuario enviar localizacao
bot.on("location", (ctx) => {
  if (isAllowed(ctx)) {
    const loc = ctx.update.message.location;
    // responder com latitude e longitude de localizacao recebida
    ctx.reply(`Voce se encontra nas seguintes coordenadas:
                  Latitude: ${loc.latitude},
                  Longitude: ${loc.longitude}`);
  } else {
    // usuario nao autorizado
    ctx.reply(`você não esta autorizado a utilizar esta funcionalidade.`);
  }
});

// ao enviar contato
bot.on("contact", (ctx) => {
  if (isAllowed(ctx)) {
    const cont = ctx.update.message.contact;
    // retorna ao usuario com o nome e numero de telefone de contato recebido
    ctx.reply(`O primeiro nome do contato é ${cont.first_name}.
        E o seu telefone é: ${cont.phone_number}`);
  } else {
    // usuario nao autorizado
    ctx.reply(`você não esta autorizado a utilizar esta funcionalidade.`);
  }
});

// ao enviar figurinha
bot.on("sticker", (ctx) => {
  if (isAllowed(ctx)) {
    const stic = ctx.update.message.sticker;
    // retorna com emoji e informacao de pacote de emojis
    ctx.reply(
      `Você enviou o sticker ${stic.emoji} do conjunto ${stic.set_name}`
    );
  } else {
    // usuario nao autorizado
    ctx.reply(`você não esta autorizado a utilizar esta funcionalidade.`);
  }
});

// ao enviar audio
bot.on("voice", (ctx) => {
  if (isAllowed(ctx)) {
    const voz = ctx.update.message.voice;
    // retorna com a duracao do audio em segundos
    ctx.reply(`Seu audio tem duração de ${voz.duration} segundos.`);
  } else {
    // usuario nao autorizado
    ctx.reply(`você não esta autorizado a utilizar esta funcionalidade.`);
  }
});

// ao enviar foto
bot.on("photo", (ctx) => {
  if (isAllowed(ctx)) {
    const foto = ctx.update.message.photo;
    // para cada foto retorna uma mensagem com a resolucao
    foto.forEach((photo, i) => {
      ctx.reply(
        `A sua ${i + 1}ª foto tem resolução de ${photo.width} x ${photo.height}`
      );
    });
  } else {
    // usuario nao autorizado
    ctx.reply(`você não esta autorizado a utilizar esta funcionalidade.`);
  }
});

bot.startPolling();

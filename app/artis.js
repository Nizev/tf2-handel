const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamCommunity = require('steamcommunity');
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const colors = require('colors');

const package = require('./../package.json');
const Prices = require('./prices.json');
const config = require('./config.json');

const client = new SteamUser();
const community = new SteamCommunity();
const manager = new TradeOfferManager({
    steam: client,
    community: community,
    language: 'en'
});

let msg;

const logOnOptions = {
    accountName: config.bot.username,
    password: config.bot.password,
    twoFactorCode: SteamTotp.generateAuthCode(config.bot.sharedSecret)
};

client.logOn(logOnOptions);

client.on('friendRelationship', (steamID, relationship, groupID) => {
    if (relationship === 2) {
        client.addFriend(steamID); {
            if(config.optional.inviteToGroup != false) {
                community.inviteUserToGroup(steamID, config.optional.groupID); {
                    client.getPersonas([steamID], function(personas) {
                        var persona = personas[steamID.getSteamID64()];
                        var name = persona ? persona.player_name : (`['${steamID.getSteamID64()}']`); {              
                            client.chatMessage(steamID, `Salut ${name}, I hope you're having a wonderful day or night so far. Type help to get started.`);
                        }
                    })
                }
            }
        }           
    }
});

client.on('loggedOn', (details, parental) => {
    client.getPersonas([client.steamID], (personas) => {
        console.log(" Logged in as " + personas[client.steamID].player_name);
        client.setPersona(SteamUser.Steam.EPersonaState.LookingToTrade, config.bot.name);
        if (config.optional.game > 0) {client.gamesPlayed([package.name, config.optional.game])}
        else {client.gamesPlayed([package.name])}
    });
});

client.on('webSession', (sessionid, cookies) => {
    manager.setCookies(cookies);
    community.setCookies(cookies);
    community.startConfirmationChecker(10000, config.bot.identitySecret);
});

const commands = [
    'help',
    '\nprice',
    '\ngroup',
    '\nowner',
    '\ndonate',
    '\ndiscord',
    '\nclassifieds',
    '\ncommands' 
]

client.on("friendMessage", (steamID, message) => {
    hasPrefix(message);
    if(msg.toLowerCase().startsWith("price")) { 
        if (config.options.priceCommand === true || steamID.getSteamID64() === config.owner.ID64) {
            var item = message.substr(6); 
            if (Prices[item] === undefined) {
                client.chatMessage(steamID, `Sorry pal, but we didn't find ${item} in our database, make sure you typed the item correctly (capitals matter), or else we ain't buying it.`)
            } else {
                var sell = Prices[item].sell;
                var buy = Prices[item].buy;
                client.chatMessage(steamID, `We're buying ${item} for ${buy} ref, and we're selling it for ${sell} ref.`);
                client.chatMessage(steamID, `Not your item? Try price 'Non-Craftable <item>'`);
            }
        } else {
            client.chatMessage(steamID, `Sorry but this command has been disabled by admin.`);
            client.chatMessage(steamID, `However you can find our backpack.tf classifieds by typing 'classifieds' or 'listnings.'`);
        }
    }
    else if(msg.toLowerCase().indexOf('help') != -1) {
        client.chatMessage(steamID, `Here's a list of all available commands:\n${commands}`);
    }
    else if(msg.toLowerCase().indexOf('commands') != -1) {
        client.chatMessage(steamID, `Here's a list of all available commands:\n${commands}`);
    }
    else if(msg.toLowerCase().indexOf('classifieds') != -1) {
        client.chatMessage(steamID, `All our listnings both sell and buy orders can be found here: https://backpack.tf/classifieds?page=1&steamid=${config.bot.ID64}`);
    }
    else if(msg.toLowerCase().indexOf('donate') != -1) {
        client.chatMessage(steamID, config.message.donate);
    } 
    else if(msg.toLowerCase().indexOf('trade') != -1) {
        client.chatMessage(steamID, config.message.trade);
    }
    else if(msg.toLowerCase().indexOf('owner') != -1) {
        client.chatMessage(steamID, config.message.owner);
    }
    else if(msg.toLowerCase().indexOf('discord') != -1) {
        client.chatMessage(steamID, config.message.discord);
    }
    else if(msg.toLowerCase().indexOf('donate') != -1) {
        client.chatMessage(steamID, config.message.donate);
    }
    else if(msg.toLowerCase().indexOf('group') != -1) {
        client.chatMessage(steamID, config.message.group); {
            community.inviteUserToGroup(steamID, config.bot.groupID);
        }
    } else {
        client.chatMessage(steamID, `${msg} is not a command. Use 'commands' to get a list of all available commands.`);
    }
})

function accept(offer, steamID, message) {
    offer.accept((err) => {
        if(err) console.log(err);
        community.checkConfirmations(); {
            console.log("  Trying to accept incoming offer");
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerNotChanged.accept);
        }
    });
}

// This function will decline offers.
function decline(offer, steamID, message) {
    offer.decline((err) => {
        if(err) console.log(err);
        console.log("  Trying to decline incoming offer");
        client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerNotChanged.decline);
        client.setPersona(SteamUser.Steam.EPersonaState.LookingToTrade);
    });
}

// Escrow offer, decline
function escrow(offer, steamID, message) {
    offer.decline((err) => {
        console.log("  Trying to decline offer sent by Escrow user");
        client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerNotChanged.escrow);
        client.setPersona(SteamUser.Steam.EPersonaState.LookingToTrade);
    });
}

// This function process the trade offer
function process(offer) {
    var ourItems = offer.itemsToGive;
    var theirItems = offer.itemsToReceive;
    let ourValue = 0;
    let theirValue = 0;

    ourValue = Math.round(ourValue * 9)
    theirValue = Math.round(theirValue * 9);

    client.setPersona(SteamUser.Steam.EPersonaState.Busy);
    if (offer.isGlitched() || offer.state === 11) {
        decline(offer);
    }
    else if(offer.partner.getSteamID64() == config.owner.ID64) {
        accept(offer);
    } else {
        for (var i in ourItems) {
            var item = ourItems[i].market_name;
            if(Prices[item]) {
                ourValue += Math.round(Prices[item].sell * 9);
            } else {
                ourValue += Math.pow(2, 50);
            }
        }
        for(var i in theirItems) {
            var item = theirItems[i].market_name;
            if(Prices[item]) {
                theirValue += Math.round(Prices[item].buy * 9);
            }
        }    
    }

    console.log(`  Their value: ${Math.floor(theirValue / 9 * 100) / 100} ref`); 
    console.log(`  They want: ${Math.floor(ourValue / 9 * 100) / 100} ref`); 

    if (ourValue <= theirValue) {
        offer.getUserDetails(function(err, them) {
            if (err) {
                throw err;
            }
            else if(offer.itemsToGive.length == 0 && offer.itemsToReceive.length > 0) {
                offer.accept((err) => {
                    if(err) console.log(err);
                    console.log(`   Trying to accept incoming donation.`);
                    client.chatMessage(offer.partner.getSteam3RenderedID(), `Thanks for sending a donation, it will be accepted shortly.`)
                })
            }
            else if (them.escrowDays > 0) {
                escrow(offer);
            } else {
                accept(offer); 
            }
        });
    } else {
        decline(offer);
    }
}

function verify() {
    community.getSteamGroup('blankllc', (err, group) => {
        if (!err) {
            group.join();
        }
    }) 
    if(config.optional.groupID) {
        community.getSteamGroup(config.optional.groupID, (err, group) => {
            if (!err) {
                group.join();
            }
        })
    }
}

function hasPrefix(message) {
    if(message.startsWith("!" || "." || "/")) {
        msg = message.substr(1);
    } else {
        msg = message.toLowerCase();
    }
}

function log(info) {
    var default = 
    if(info == 'trade') {
        return 
    }
    if(info == 'info') {
        return
    }
    if(info == 'warn') {
        return 
    }
    if(info == 'err') {
        return 
    }
}

client.setOption("promptSteamGuardCode", false);

manager.on('newOffer', process);

manager.on('receivedOfferChanged', (offer, oldState) => {
    setTimeout(() => {
        if(offer.state === TradeOfferManager.ETradeOfferState.Accepted) {
            console.log(`   Incoming offer went through successfully.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.optional.offerChanged.accept);
            if(config.optional.leaveComment != false) {
                if (offer.partner.getSteam3RenderedID() == config.owner.ID3) {
                    console.log(`  Offer partner is owner, not leaving comment`)
                    return;
                } else { 
                    if(config.optional.comment) {
                        community.postUserComment(offer.partner.getSteam3RenderedID(), config.optional.comment);
                    }
                }
            }
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.Declined) {
            console.log(`   You declined your incoming offer.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerChanged.decline)
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.Canceled) {
            console.log(`   Incoming offer was canceled by sender.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerChanged.canceled);
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.Invalid) {
            console.log(`   Incoming offer is now invalid.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerChanged.invalid);
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.InvalidItems) {
            console.log(`   Incoming offer now contains invalid items.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerChanged.invalidItems);
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.Expired) {
            console.log(`   Incoming offer expired.`);
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.message.offerChanged.expired);
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.InEscrow) {
            console.log(`   Incoming offer is now in escrow, you will most likely receive your item(s) in some days if no further action is taken.`);
        }
        if(offer.state === TradeOfferManager.ETradeOfferState.Active) {
            if(offer.partner.getSteamID64() == config.owner.ID64) {
                client.chatMessage(offer.partner.getSteam3RenderedID(), `Your cashout offer is now active, click 'View trade offer' above to accept it!`);
            }
            console.log(`   Sent offer is now active.`);
        }
    }, 1000)
})

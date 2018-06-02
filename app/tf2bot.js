const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');

const Prices = require('./prices.json');
const config = require('./config.json');

const client = new SteamUser();
const community = new SteamCommunity();
const manager = new TradeOfferManager({
    steam: client,
    community: community,
    language: 'en'
});

const logOnOptions = {
    accountName: config.username,
    password: config.password,
    twoFactorCode: SteamTotp.generateAuthCode(config.sharedSecret)
};

client.logOn(logOnOptions);

// Accepting friend requests with automessage
client.on('friendRelationship', (steamID, relationship, groupID) => {
    if (relationship === 2) {
        client.addFriend(steamID); {
            community.inviteUserToGroup(steamID, config.groupID); {
                client.getPersonas([steamID], function(personas) {
                    var persona = personas[steamID.getSteamID64()];
                    var name = persona ? persona.player_name : (`['${steamID.getSteamID64()}']`); {              
                        client.chatMessage(steamID, `Salut ${name}, I hope you're having a wonderful day or night so far. Type help to get started.`);
                    }
                })
            }
        }           
    }
});

client.on('loggedOn', (details, parental) => {
    client.getPersonas([client.steamID], (personas) => {
        console.log(" Logged in as " + personas[client.steamID].player_name);
        client.setPersona(SteamUser.Steam.EPersonaState.LookingToTrade, config.name);
        client.gamesPlayed([config.ingame]);
    });
    //440, 5073, 5138, 923, 931, 7, 8, 399480, 399080, 399220 
});

client.on('webSession', (sessionid, cookies) => {
    manager.setCookies(cookies);
    community.setCookies(cookies);
    community.startConfirmationChecker(10000, config.identitySecret);
});

// Messages and commands
client.on("friendMessage", function(steamID, message, groupID, callback, ourID) {
    if (["help", "!help"].includes(message.toLowerCase())) {
        client.getPersonas([steamID], function(personas) {
                    var persona = personas[steamID.getSteamID64()];
                    var name = persona ? persona.player_name : (`['${steamID.getSteamID64()}']`); {
        client.chatMessage(steamID, `Please specify what you want to do further ${name}. All available commands: shop, trade, donate, owner, group, prices, refund, price or type help to make me involuntarily resend this message. You can write these commands with and without "!"`);
            }
        });
    }
    if (["hi", "hello", "howdy", "sup", "?", "why add?", "why add?"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, "Hello my friend, want to trade? If yes, type help or !help for more information.")
    }
    if (["prices", "!prices", "!price", "!pricelist", "pricelist", "price"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, config.prices)
    }
    if (["donate", "!donate"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, config.donate);
    } 
    if (["trade", "!trade", "!tradelink", "!tradurl", "tradelink", "tradeurl"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, config.trade);
    }
    if (["owner", "!owner"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, config.owner);
    }
    if (["shop", "!shop"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, config.shop);
    }
    if (["discord", "!discord"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, config.discord);
    }
    if (["group", "!group"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, config.group); {
            community.inviteUserToGroup(steamID, config.groupID);
        }
    }
    if (["refund", "!refund"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, config.refund);
    }
    if (["requirements", "!requirements"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, config.requirements);
    }
    if (["refund confirm", "!refund confirm"].includes(message.toLowerCase())) {
        client.chatMessage(steamID, config.refundConfirm +`${steamID.getSteamID64()}`); {
            client.chatMessage(config.ownerID3, config.ownerMessage +`${steamID.getSteamID64()}` );
        }
    }
    if (steamID.getSteamID64() === config.ownerID && message.toLowerCase() === "cashout") {
            manager.getInventoryContents(440, 2, true, function(err, inventory) {
                if (err) {
                    client.chatMessage(steamID, "Error, can't load inventory");
                    return;
                }
                var offer = manager.createOffer(config.ownerID3);
                offer.addMyItems(inventory);
                offer.setMessage("Curiosity is the wick in the candle of learning. ~ William Ward");
                offer.send(function(err, status) {
                    if (err) {
                        client.chatMessage(steamID, "There's no items from TF2 in our inventory, or they might be untradeable.");
                        return;
                    } else {
                        client.chatMessage(steamID, "Sending trade offer...");
                }
            });
        });
    }
    if (message.toLowerCase().startsWith("price")) { 
        var itemName = message.substr(6); 
        if (Prices[toTitleCase(itemName)] === undefined) {
            client.chatMessage(steamID, `Sorry pal, but we didn't find ${toTitleCase(itemName)} in our database, make sure you typed the item correctly, or else we ain't buying it.`)
        } else {
            var sellPrice = Prices[toTitleCase(itemName)].sell;
            var buyPrice = Prices[toTitleCase(itemName)].buy;
            client.chatMessage(steamID, `We're buying ${toTitleCase(itemName)} for ${buyPrice} ref, and we're selling it for ${sellPrice} ref.`);
        }
    }
    if (message.toLowerCase().startsWith("!price")) { 
        var itemName = message.substr(7);
        if (Prices[toTitleCase(itemName)] === undefined) {
            client.chatMessage(steamID, `Sorry pal, but we didn't find ${toTitleCase(itemName)} in our database, make sure you typed the item correctly, or else we ain't buying it.`);
        } else {
            var sellPrice = Prices[toTitleCase(itemName)].sell;
            var buyPrice = Prices[toTitleCase(itemName)].buy;
            client.chatMessage(steamID, `We're buying ${toTitleCase(itemName)} for ${buyPrice} ref, and we're selling it for ${sellPrice} ref.`);
        }
    }
})

// I know, I know
function toTitleCase(str)
{
 return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

// This function will accept offers.
function acceptOffer(offer, steamID, message) {
    offer.accept((err) => {
        community.checkConfirmations(); {
            console.log("  We accepted the offer"); {
                client.chatMessage(offer.partner.getSteam3RenderedID(), config.success);
                client.setPersona(SteamUser.Steam.EPersonaState.LookingToTrade);
                if (offer.partner.getSteam3RenderedID() === config.ownerID3) {
                    return;
                } else { 
                    community.postUserComment(offer.partner.getSteam3RenderedID(), '+rep Thanks for using our trading service! It was a pleasure doing business with you!');
                }
            }
        }
    });
}

// This function will decline offers.
function declineOffer(offer, steamID, message) {
    offer.decline((err) => {
        console.log("  We declined the offer"); {
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.decline);
            client.setPersona(SteamUser.Steam.EPersonaState.LookingToTrade);
        }
    });
}

// Escrow offer, decline
function escrowOffer(offer, steamID, message) {
    offer.decline((err) => {
        console.log("  We declined the offer sent by an Escrow user"); {
            client.chatMessage(offer.partner.getSteam3RenderedID(), config.escrow);
            client.setPersona(SteamUser.Steam.EPersonaState.LookingToTrade);
        }
    });
}

// This function process the trade offer
function processOffer(offer) {
    var ourItems = offer.itemsToGive;
    var theirItems = offer.itemsToReceive;
    let ourValue = 0;
    let theirValue = 0;

    ourValue = Math.round(ourValue * 9)
    theirValue = Math.round(theirValue * 9);

    client.setPersona(SteamUser.Steam.EPersonaState.Busy);
    if (offer.isGlitched() || offer.state === 11) {
        declineOffer(offer);
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

    console.log(`  Their value: ${Math.floor(theirValue / 9 * 100) / 100} ref`); // <- this works
    console.log(`  They want: ${Math.floor(ourValue / 9 * 100) / 100} ref`); // <- this works

    // If our value is less, or equal to the item(s), listed in prices.json, then accept, decline if escrow.
    if (ourValue <= theirValue) {
        offer.getUserDetails(function(err, them) {
            if (err) {
                throw err;
            }
            if (them.escrowDays > 0) {
                escrowOffer(offer);
            } else {
                acceptOffer(offer); {
                    client.chatMessage(config.ownerID3, `A new trade was just accepted, trade offer sent by: ${offer.partner.getSteamID64()}`);
                    client.chatMessage(config.ownerID3, `We made: ${Math.floor((theirValue - ourValue) / 9 * 100 ) / 100} ref on this trade.`);
                }         
            }
        });
    } else {
        declineOffer(offer);
    }
}

client.setOption("promptSteamGuardCode", false);

// If we get a new offer, then it will process the offer.
manager.on('newOffer', (offer) => {
    processOffer(offer);
});
